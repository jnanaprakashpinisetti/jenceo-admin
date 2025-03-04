import React, { useRef } from 'react';
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';
import { useReducer } from 'react';

export default function PeresentAddress({ onPresentAddressNext, onPresentAddressPrevious }) {

    let empCrntDNo = useReducer(null)
    let empVillage = useRef(null)
    let empCrntStreet = useRef(null)
    let empCrntMandal = useRef(null)
    let empCrntDistrict = useRef(null)
    let empCrntState = useRef(null)



    let validatePresentDnO = () => {
        if (empCrntDNo.current.value === "") {
            empCrntDNo.current.parentNode.classList.add("error")
        } else {
            empCrntDNo.current.parentNode.classList.remove("error")
        }
    }

    let validateEmpPersentVillage = () => {
        if (empVillage.current.value === "") {
            empVillage.current.parentNode.classList.add("error")
        } else {
            empVillage.current.parentNode.classList.remove("error")
        }
    }
    let validateEmpPersentStreetName = () => {
        if (empCrntStreet.current.value === "") {
            empCrntStreet.current.parentNode.classList.add("error")
        } else {
            empCrntStreet.current.parentNode.classList.remove("error")
        }
    }
    let validateEmpPersentMandal = () => {
        if (empCrntMandal.current.value === "") {
            empCrntMandal.current.parentNode.classList.add("error")
        } else {
            empCrntMandal.current.parentNode.classList.remove("error")
        }
    }
    let validateEmpPersentDistrict = () => {
        if (empCrntDistrict.current.value === "") {
            empCrntDistrict.current.parentNode.classList.add("error")
        } else {
            empCrntDistrict.current.parentNode.classList.remove("error")
        }
    }
    let validateEmpPersentState = () => {
        if (empCrntState.current.value === "") {
            empCrntState.current.parentNode.classList.add("error")
        } else {
            empCrntState.current.parentNode.classList.remove("error")
        }
    }

    // On CLick of Present address Next Btn
    let presentAddressNext = () => {
        validatePresentDnO()
        validateEmpPersentVillage()
        validateEmpPersentStreetName()
        validateEmpPersentMandal()
        validateEmpPersentDistrict()
        validateEmpPersentState()

        const isValidateempCrntDNo = empCrntDNo.current.value !== "";
        const isValidateempVillage = empVillage.current.value !== "";
        const isValidateempCrntStreet = empCrntStreet.current.value !== "";
        const isValidateempCrntMandal = empCrntMandal.current.value !== "";
        const isValidateempCrntDistrict = empCrntDistrict.current.value !== "";
        const isValidateempCrntState = empCrntState.current.value !== "";

        if (
            isValidateempCrntDNo &&
            isValidateempVillage &&
            isValidateempCrntStreet &&
            isValidateempCrntMandal &&
            isValidateempCrntDistrict &&
            isValidateempCrntState

        ) {
            onPresentAddressNext()
            console.log("sucess")

        } else {
            console.log("error");

        }

    }

    let presentAddressPrevious = () => {
        onPresentAddressPrevious()

    }



    return (
        <div id="peresentAddress">
            <h4>3. Peresent Address</h4>
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
                    eventHandler={validatePresentDnO}
                    useref={empCrntDNo}
                    errorMsg="Enter D.No"
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
                    eventHandler={validateEmpPersentVillage}
                    useref={empVillage}
                    errorMsg="Enter Village / Town"
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
                    eventHandler={validateEmpPersentStreetName}
                    useref={empCrntStreet}
                    errorMsg="Enter Street Name"

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
                    eventHandler={validateEmpPersentMandal}
                    useref={empCrntMandal}
                    errorMsg="Enter Mandal"
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
                    eventHandler={validateEmpPersentDistrict}
                    useref={empCrntDistrict}
                    errorMsg="Enter District"
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
                    eventHandler={validateEmpPersentState}
                    useref={empCrntState}
                    errorMsg="Enter State"
                />
            </div>
            <Button
                btnType="button"
                btnID="presentAddressNextBtn"
                btnClass="btn primery"
                btnText="Next"
                clickHandler={presentAddressNext}
            />
            <Button
                btnType="button"
                btnID="presentAddressPreBtn"
                btnClass="btn primery"
                btnText="Previous"
                clickHandler={presentAddressPrevious}
            />

        </div>

    )
}
