import React from 'react';
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';

export default function PeresentAddress() {
    return (
        <div id="peresentAddress">
            <h4>Peresent Address</h4>
            <hr></hr>
            <div className="row">
                <InputText
                    htmlFor="empCrntDNo"
                    star="*"
                    labelName="Address / D.No"
                    type="text"
                    idName="empCrntDNo"
                    inputName="empCrntDNo"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="empVillage"
                    star="*"
                    labelName="Village / Town"
                    type="text"
                    idName="empVillage"
                    inputName="empVillage"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

            </div>

            <div className="row">
                <InputText
                    htmlFor="empCrntStreet"
                    star="*"
                    labelName="Street Name"
                    type="text"
                    idName="empCrntStreet"
                    inputName="empCrntStreet"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="empCrntMandal"
                    star="*"
                    labelName="Mandal"
                    type="text"
                    idName="empCrntMandal"
                    inputName="empCrntMandal"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

            </div>

            <div className="row">
                <InputText
                    htmlFor="empCrntDistrict"
                    star="*"
                    labelName="District"
                    type="text"
                    idName="empCrntDistrict"
                    inputName="empCrntDistrict"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="empCrntState"
                    star="*"
                    labelName="State"
                    type="text"
                    idName="empCrntState"
                    inputName="empCrntState"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />
            </div>
            <Button
                btnType="button"
                btnID="presentAddressNextBtn"
                btnClass="btn primery"
                btnText="Next"
            // clickHandler = {}
            />
            <Button
                btnType="button"
                btnID="presentAddressPreBtn"
                btnClass="btn primery"
                btnText="Previous"
            // clickHandler = {}
            />

        </div>

    )
}
