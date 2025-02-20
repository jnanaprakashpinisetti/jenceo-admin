import React from 'react'
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';

export default function PermanentAddress() {
    return (
        <div id="permanentAddress">
            {/****** Permanent Address starts ******/}
            <div className="row">
                <InputText
                    htmlFor="empPerDNo"
                    star="*"
                    labelName="Address / D.No"
                    type="text"
                    idName="empPerDNo"
                    inputName="empPerDNo"
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
                    htmlFor="empPerStreet"
                    star="*"
                    labelName="Street Name"
                    type="text"
                    idName="empPerStreet"
                    inputName="empPerStreet"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="empPerMandal"
                    star="*"
                    labelName="Mandal"
                    type="text"
                    idName="empPerMandal"
                    inputName="empPerMandal"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

            </div>

            <div className="row">
                <InputText
                    htmlFor="empPerDistrict"
                    star="*"
                    labelName="District"
                    type="text"
                    idName="empPerDistrict"
                    inputName="empPerDistrict"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="empPerState"
                    star="*"
                    labelName="State"
                    type="text"
                    idName="empPerState"
                    inputName="empPerState"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />
            </div>
            <Button
                btnType="button"
                btnID="permanentAddressNextBtn"
                btnClass="btn primery"
                btnText="Next"
            />
            <Button
                btnType="button"
                btnID="permanentAddressPreBtn"
                btnClass="btn primery"
                btnText="Previous"
            />

        </div>

    )
}
