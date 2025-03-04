import React from 'react';
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';

export default function EmergencyContact1({ onEmergencyContact1Next, onEmergencyContact1Previous }) {

    // Event handlers for the Next and Previous buttons
    const emergencyContact1Next = () => {
        onEmergencyContact1Next();  // Calling the parent function passed via props
    }

    const emergencyContact1Previous = () => {
        onEmergencyContact1Previous();  // Calling the parent function passed via props
    }

    return (
        <div id='emergencyContact1'>
            <h4>7. Emergency Contact-1</h4>
            <hr />
            <div className="row">
                <InputText
                    htmlFor="contact1"
                    star="*"
                    labelName=" Contact-1"
                    type="text"
                    idName="contact1"
                    inputName="contact1"
                    required="required"
                />
                <InputText
                    htmlFor="contact1Relation"
                    star="*"
                    labelName="Relation"
                    type="text"
                    idName="contact1Relation"
                    inputName="contact1Relation"
                    required="required"
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
                    required="required"
                />
                <InputText
                    htmlFor="contact1Village"
                    star="*"
                    labelName=" Village / Town"
                    type="text"
                    idName="contact1Village"
                    inputName="contact1Village"
                    required="required"
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
                    required="required"
                />
                <InputText
                    htmlFor="contact1State"
                    star="*"
                    labelName="State"
                    type="text"
                    idName="contact1State"
                    inputName="contact1State"
                    required="required"
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
                    required="required"
                />
                <InputText
                    htmlFor="contact1Mobile2"
                    star="*"
                    labelName="Mobile-2"
                    type="number"
                    idName="contact1Mobile2"
                    inputName="contact1Mobile2"
                    required="required"
                />
            </div>

            <Button
                btnType="button"
                btnID="contact1NextBtn"
                btnClass="btn primery"
                btnText="Next"
                clickHandler={emergencyContact1Next}  // Passing the handler to the button
            />

            <Button
                btnType="button"
                btnID="contact1PreBtn"
                btnClass="btn primery"
                btnText="Previous"
                clickHandler={emergencyContact1Previous}  // Passing the handler to the button
            />
        </div>
    );
}
