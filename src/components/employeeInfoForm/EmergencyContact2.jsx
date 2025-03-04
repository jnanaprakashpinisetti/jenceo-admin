import React from 'react';
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';

export default function EmergencyContact2({ onEmergencyContact2Next, onEmergencyContact2Previous }) {

    const emergencyContact2Next = () => {
        onEmergencyContact2Next();  // Calling the parent function passed via props
    }

    const emergencyContact2Previous = () => {
        onEmergencyContact2Previous();  // Calling the parent function passed via props
    }

    return (
        <div id='emergencyContact2'>
            <h4>8. Emergency Contact-2</h4>
            <hr />
            <div className="row">
                <InputText
                    htmlFor="contact2"
                    labelName=" Contact-2"
                    type="text"
                    idName="contact2"
                    inputName="contact2"
                />
                <InputText
                    htmlFor="contact2Relation"
                    labelName="Relation"
                    type="text"
                    idName="contact2Relation"
                    inputName="contact2Relation"
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact2DNo"
                    labelName=" D.No / Street"
                    type="text"
                    idName="contact2DNo"
                    inputName="contact2DNo"
                />
                <InputText
                    htmlFor="contact2Village"
                    labelName=" Village / Town"
                    type="text"
                    idName="contact2Village"
                    inputName="contact2Village"
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact2Mandal"
                    labelName=" Mandal"
                    type="text"
                    idName="contact2Mandal"
                    inputName="contact2Mandal"
                />
                <InputText
                    htmlFor="contact2State"
                    labelName="State"
                    type="text"
                    idName="contact2State"
                    inputName="contact2State"
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact2Mobile1"
                    labelName="Mobile-1"
                    type="number"
                    idName="contact2Mobile1"
                    inputName="contact2Mobile1"
                />
                <InputText
                    htmlFor="contact2Mobile2"
                    labelName="Mobile-2"
                    type="number"
                    idName="contact2Mobile2"
                    inputName="contact2Mobile2"
                />
            </div>

            <Button
                btnType="button"
                btnID="contact2NextBtn"
                btnClass="btn primery"
                btnText="Next"
                clickHandler={emergencyContact2Next}  // Calling the next button handler
            />

            <Button
                btnType="button"
                btnID="contact2PreBtn"
                btnClass="btn primery"
                btnText="Previous"
                clickHandler={emergencyContact2Previous}  // Calling the previous button handler
            />
        </div>
    );
}
