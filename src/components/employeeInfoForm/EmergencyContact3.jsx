import React from 'react';
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';

export default function EmergencyContact3({ onEmergencyContact3Next, onEmergencyContact3Previous }) {

    const emergencyContact3Next = () => {
        onEmergencyContact3Next();  // Calling the parent function passed via props
    }

    const emergencyContact3Previous = () => {
        onEmergencyContact3Previous();  // Calling the parent function passed via props
    }

    return (
        <div id='emergencyContact3'>
            <h4>9. Emergency Contact-3</h4>
            <hr />
            <div className="row">
                <InputText
                    htmlFor="contact3"
                    labelName=" Contact-3"
                    type="text"
                    idName="contact3"
                    inputName="contact3"
                />
                <InputText
                    htmlFor="contact3Relation"
                    labelName="Relation"
                    type="text"
                    idName="contact3Relation"
                    inputName="contact3Relation"
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact3DNo"
                    labelName=" D.No / Street"
                    type="text"
                    idName="contact3DNo"
                    inputName="contact3DNo"
                />
                <InputText
                    htmlFor="contact3Village"
                    labelName=" Village / Town"
                    type="text"
                    idName="contact3Village"
                    inputName="contact3Village"
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact3Mandal"
                    labelName=" Mandal"
                    type="text"
                    idName="contact3Mandal"
                    inputName="contact3Mandal"
                />
                <InputText
                    htmlFor="contact3State"
                    labelName="State"
                    type="text"
                    idName="contact3State"
                    inputName="contact3State"
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact3Mobile1"
                    labelName="Mobile-1"
                    type="number"
                    idName="contact3Mobile1"
                    inputName="contact3Mobile1"
                />
                <InputText
                    htmlFor="contact3Mobile2"
                    labelName="Mobile-2"
                    type="number"
                    idName="contact3Mobile2"
                    inputName="contact3Mobile2"
                />
            </div>

            <Button
                btnType="button"
                btnID="contact3NextBtn"
                btnClass="btn primery"
                btnText="Next"
                clickHandler={emergencyContact3Next}  // Calling the next button handler
            />

            <Button
                btnType="button"
                btnID="contact3PreBtn"
                btnClass="btn primery"
                btnText="Previous"
                clickHandler={emergencyContact3Previous}  // Calling the previous button handler
            />
        </div>
    );
}
