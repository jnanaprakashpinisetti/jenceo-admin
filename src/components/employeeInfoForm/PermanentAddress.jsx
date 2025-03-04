import React, { useRef } from 'react'
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';
import { useReducer } from 'react';

export default function PermanentAddress({ onPermanentAddressNext, onPermanentAddressPrevious }) {

    let empPerDNo = useRef(null);
    let empVillage = useReducer(null)
    let empPerStreet = useReducer(null)
    let empPerMandal = useReducer(null)
    let empPerDistrict = useReducer(null)
    let empPerState = useReducer(null)


    // Validate Door No
    let validateEmpPerDno = () => {
        if (empPerDNo.current.value === "") {
            empPerDNo.current.parentNode.classList.add("error")
            return false
        } else {
            empPerDNo.current.parentNode.classList.remove("error")
            return true
        }
    }

    // Validate Village / Town
    let validateEmpPerVillage = () => {
        if (empVillage.current.value === "") {
            empVillage.current.parentNode.classList.add("error")
            return false
        } else {
            empVillage.current.parentNode.classList.remove("error")
            return true
        }
    }

    // Validate Street
    let validateEmpPerStreetName = () => {
        if (empPerStreet.current.value === "") {
            empPerStreet.current.parentNode.classList.add("error")
            return false
        } else {
            empPerStreet.current.parentNode.classList.remove("error")
            return true
        }
    }
    // Validate Street
    let validateEmpPerMandal = () => {
        if (empPerMandal.current.value === "") {
            empPerMandal.current.parentNode.classList.add("error")
            return false
        } else {
            empPerMandal.current.parentNode.classList.remove("error")
            return true
        }
    }

    // Validate District
    let validateEmpPerDistrict = () => {
        if (empPerDistrict.current.value === "") {
            empPerDistrict.current.parentNode.classList.add("error")
        } else {
            empPerDistrict.current.parentNode.classList.remove("error")
        }
    }
    // Validate District
    let validateEmpPerState = () => {
        if (empPerState.current.value === "") {
            empPerState.current.parentNode.classList.add("error")
        } else {
            empPerState.current.parentNode.classList.remove("error")
        }
    }




    let permanentAddressNext = () => {
        validateEmpPerDno()
        validateEmpPerVillage()
        validateEmpPerStreetName()
        validateEmpPerMandal()
        validateEmpPerDistrict()
        validateEmpPerState()

        const isValidateEmpPerDno = empPerDNo.current.value !== "";
        const isValidateEmpPerVillage = empVillage.current.value !== "";
        const isValidateEmpPerStreetName = empPerStreet.current.value !== "";
        const isValidateEmpPerMandal = empPerMandal.current.value !== "";
        const isValidateEmpPerDistrict = empPerDistrict.current.value !== "";
        const isValidateEmpPerState = empPerState.current.value !== "";

        if (
            isValidateEmpPerDno &&
            isValidateEmpPerVillage &&
            isValidateEmpPerStreetName &&
            isValidateEmpPerMandal &&
            isValidateEmpPerDistrict &&
            isValidateEmpPerState) {
            console.log("all fields valide");
            onPermanentAddressNext()


        } else {
            console.log("erro")
        }
    }

    let permanentAddressPrevious = () => {
        onPermanentAddressPrevious()
    }
    return (
        <div id="permanentAddress">
            <h4>2. Permanent Address</h4>
            <hr></hr>

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
                    eventHandler={validateEmpPerDno}
                    useref={empPerDNo}
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
                    eventHandler={validateEmpPerVillage}
                    useref={empVillage}
                    errorMsg="Enter Village / Yown"
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
                    eventHandler={validateEmpPerStreetName}
                    useref={empPerStreet}
                    errorMsg="Enter Street Name"
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
                    eventHandler={validateEmpPerMandal}
                    useref={empPerMandal}
                    errorMsg="Enter Mandal"
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
                    eventHandler={validateEmpPerDistrict}
                    useref={empPerDistrict}
                    errorMsg="Enter District"
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
                    eventHandler={validateEmpPerState}
                    useref={empPerState}
                    errorMsg="Enter State"
                />
            </div>
            <Button
                btnType="button"
                btnID="permanentAddressNextBtn"
                btnClass="btn primery"
                btnText="Next"
                clickHandler={permanentAddressNext}
            />
            <Button
                btnType="button"
                btnID="permanentAddressPreBtn"
                btnClass="btn primery"
                btnText="Previous"
                clickHandler={permanentAddressPrevious}
            />

        </div>

    )
}
