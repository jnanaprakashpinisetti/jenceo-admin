import React, { useRef, useState } from 'react';
import InputText from '../formElements/InputText';
import InputRadio from '../formElements/InputRadio';
import InputDate from '../formElements/InputDate';
import Button from '../formElements/Button';

export default function BasicInfo() {
    let date = new Date();
    let years = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let day = String(date.getDate()).padStart(2, '0');

    let minYear = `${years - 18}-${month}-${day}`;
    let maxYear = `${years - 50}-${month}-${day}`;

    let empFirstName = useRef(null);
    let empLastName = useRef(null);
    let empDob = useRef(null);
    let empYears = useRef(null);
    let careOf = useRef(null);
    let empMobile1 = useRef(null);
    let empMobile2 = useRef(null);
    let empAadharNo = useRef(null);
    let empLocalId = useRef(null);

    // Error Use Ref
    let errorUseref = useRef(null);
    let empBobile1Erro = useRef(null);
    let empBobile2Erro = useRef(null);
    let empAadharNoErro = useRef(null);
    let empLocalIdErro = useRef(null);

    // Gender State
    let [gender, setGender] = useState("");

    // First Name Validation
    let validateFirstName = () => {
        if (empFirstName.current.value === "") {
            empFirstName.current.parentNode.classList.add("error");
        } else {
            empFirstName.current.parentNode.classList.remove("error");
        }
    };

    // Last Name Validation
    let validateLastName = () => {
        if (empLastName.current.value === "") {
            empLastName.current.parentNode.classList.add("error");
        } else {
            empLastName.current.parentNode.classList.remove("error");
        }
    };

    // Gender Validation
    let validateGender = (e) => {
        const selectedGender = e.target.value;
        setGender(selectedGender);

        if (selectedGender === "") {
            document.getElementById("radioBtnWrapper").classList.add("error");
        } else {
            document.getElementById("radioBtnWrapper").classList.remove("error");
        }
    };

    // Date of Birth Validation
    let validateDateOfBirth = () => {
        if (empDob.current.value === "") {
            empDob.current.parentNode.classList.add("error");
        } else {
            empDob.current.parentNode.classList.remove("error");
        }
    };

    // Years Validation
    let validateYears = () => {
        if (empYears.current.value === "") {
            empYears.current.parentNode.classList.add("error");
        } else if (empYears.current.value <= 17) {
            empYears.current.parentNode.classList.add("error");
            errorUseref.current.innerText = "Age 18 and above only";
        } else if (empYears.current.value > 50) {
            empYears.current.parentNode.classList.add("error");
            errorUseref.current.innerText = "Age 50 and below only";
        } else {
            empYears.current.parentNode.classList.remove("error");
        }
    };

    // S/o D/o W/o Validation
    let validateCareOf = () => {
        if (careOf.current.value === "") {
            careOf.current.parentNode.classList.add("error");
        } else {
            careOf.current.parentNode.classList.remove("error");
        }
    };

    // Mobile No-1 Validation
    let validateMobile1 = () => {
        if (empMobile1.current.value === "") {
            empMobile1.current.parentNode.classList.add("error");
        } else if (empMobile1.current.value.length < 10) {
            empMobile1.current.parentNode.classList.add("error");
            empBobile1Erro.current.innerText = "Mobile No should be 10 digits";
        } else if (empMobile1.current.value.length > 10) {
            empMobile1.current.parentNode.classList.add("error");
            empBobile1Erro.current.innerText = "Mobile No should be 10 digits";
        } else {
            empMobile1.current.parentNode.classList.remove("error");
        }
    };

    // Mobile No-2 Validation
    let validateMobile2 = () => {
        if (empMobile2.current.value !== "" && empMobile2.current.value.length < 10) {
            empMobile2.current.parentNode.classList.add("error");
        } else if (empMobile2.current.value.length > 10) {
            empMobile2.current.parentNode.classList.add("error");
            empBobile2Erro.current.innerText = "Mobile No should be 10 digits";
        } else {
            empMobile2.current.parentNode.classList.remove("error");
        }
    };

    // Aadhar Validation
    let validateAadgar = () => {
        if (empAadharNo.current.value === "") {
            empAadharNo.current.parentNode.classList.add("error");
        } else if (empAadharNo.current.value.length < 12) {
            empAadharNo.current.parentNode.classList.add("error");
            empAadharNoErro.current.innerText = "Aadhar No should be 12 digits";
        } else if (empAadharNo.current.value.length > 12) {
            empAadharNo.current.parentNode.classList.add("error");
            empAadharNoErro.current.innerText = "Aadhar No should be 12 digits";
        } else {
            empAadharNo.current.parentNode.classList.remove("error");
        }
    };

    // Local ID Validation
    let validateLocalId = () => {
        if (empLocalId.current.value === "") {
            empLocalId.current.parentNode.classList.add("error");
        } else if (empLocalId.current.value.length < 5) {
            empLocalId.current.parentNode.classList.add("error");
            empLocalIdErro.current.innerText = "Local ID should be 5 or more characters";
        } else {
            empLocalId.current.parentNode.classList.remove("error");
        }
    };

    // Validate all fields on button click
    function basicInfoNext() {
        validateFirstName();
        validateLastName();
        validateDateOfBirth();
        validateYears();
        validateCareOf();
        validateMobile1();
        validateMobile2();
        validateAadgar();
        validateLocalId();

        // Validate gender
        if (gender === "") {
            document.getElementById("radioBtnWrapper").classList.add("error");
        } else {
            document.getElementById("radioBtnWrapper").classList.remove("error");
        }

        // Check if all fields are valid
        const isFirstNameValid = empFirstName.current.value !== "";
        const isLastNameValid = empLastName.current.value !== "";
        const isGenderValid = gender !== "";
        const isDobValid = empDob.current.value !== "";
        const isYearsValid = empYears.current.value >= 18 && empYears.current.value <= 50;
        const isCareOfValid = careOf.current.value !== "";
        const isMobile1Valid = empMobile1.current.value.length === 10;
        const isMobile2Valid = empMobile2.current.value === "" || empMobile2.current.value.length === 10;
        const isAadharValid = empAadharNo.current.value.length === 12;
        const isLocalIdValid = empLocalId.current.value.length >= 5;

        // If all fields are valid, proceed to the next step
        if (
            isFirstNameValid &&
            isLastNameValid &&
            isGenderValid &&
            isDobValid &&
            isYearsValid &&
            isCareOfValid &&
            isMobile1Valid &&
            isMobile2Valid &&
            isAadharValid &&
            isLocalIdValid
        ) {
            console.log("All fields are valid. Proceeding to the next step...");
            // Add logic to proceed to the next step
        } else {
            console.log("Please fix the errors before proceeding.");
        }
    }

    return (
        <div id="empBasicInfo">
            <h4>Employee Basic Information</h4>
            <hr />
            {/* Basic Info Section */}
            <div className="row">
                {/*** First Name ***/}
                <InputText
                    htmlFor="empFirstName"
                    star="*"
                    labelName="First Name"
                    type="text"
                    idName="empFirstName"
                    inputName="empFirstName"
                    required="required"
                    eventHandler={validateFirstName}
                    useref={empFirstName}
                    errorMsg="Please Enter First Name"
                />

                {/*** Last Name ***/}
                <InputText
                    htmlFor="empLastName"
                    star="*"
                    labelName="Last Name"
                    type="text"
                    idName="empLastName"
                    inputName="empLastName"
                    required="required"
                    eventHandler={validateLastName}
                    errorMsg="Enter Family Name"
                    useref={empLastName}
                />
            </div>

            {/**** Gender ****/}
            <div className="row" id='radioBtnWrapper'>
                <label className='form-label'>
                    <span className='star'>* </span>
                    Gender
                </label>
                <div className="col">
                    <InputRadio
                        idName="empMale"
                        inputName="empGender"
                        value="Male"
                        labelName="Male"
                        htmlFor="empMale"
                        changeHandler={validateGender}
                    />
                    <InputRadio
                        idName="empFemale"
                        inputName="empGender"
                        value="Female"
                        labelName="Female"
                        htmlFor="empFemale"
                        changeHandler={validateGender}
                    />
                    <InputRadio
                        idName="empOthers"
                        inputName="empGender"
                        value="Others"
                        labelName="Others"
                        htmlFor="empFOthers"
                        changeHandler={validateGender}
                    />
                    <p className='error-msg'> Please Select gender</p>
                </div>
            </div>

            <div className="row">
                {/**** Date of Birth ****/}
                <InputDate
                    htmlFor="empDob"
                    star="* "
                    labelName="Date Of Birth"
                    idName="empDob"
                    inputName="empDob"
                    required="required"
                    minDate={maxYear}
                    maxDate={minYear}
                    blurHandler={validateDateOfBirth}
                    errorMsg="Enter Date of Birth"
                    useref={empDob}
                />

                <InputText
                    htmlFor="empYears"
                    star="*"
                    labelName="Years"
                    type="number"
                    idName="empYears"
                    inputName="empYears"
                    required="required"
                    min='18'
                    max='50'
                    eventHandler={validateYears}
                    errorMsg="Enter Years"
                    useref={empYears}
                    errorMgsId="yearError"
                    errorUseref={errorUseref}
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="empCareOf"
                    star="*"
                    labelName="S/o D/o W/o"
                    type="text"
                    idName="empCareOf"
                    inputName="empCareOf"
                    required="required"
                    eventHandler={validateCareOf}
                    useref={careOf}
                    errorMgsId="careOfErro"
                    errorMsg="Enter S/o D/o W/o"
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="empMob1"
                    star="*"
                    labelName="Mobile No-1"
                    type="number"
                    idName="empMob1"
                    inputName="empMob1"
                    required="required"
                    eventHandler={validateMobile1}
                    useref={empMobile1}
                    errorMsg="Enter Mobile No"
                    errorMgsId="empBobile1Erro"
                    errorUseref={empBobile1Erro}
                />
                <InputText
                    htmlFor="empMob2"
                    labelName="Mobile No-2"
                    type="number"
                    idName="empMob2"
                    inputName="empMob2"
                    required={false}
                    eventHandler={validateMobile2}
                    useref={empMobile2}
                    errorMsg="Mobile No should be 10 digits"
                    errorMgsId="empBobile1Erro"
                    errorUseref={empBobile2Erro}
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="empAadhar"
                    star="*"
                    labelName="Aadhar No"
                    type="number"
                    idName="empAadhar"
                    inputName="empAadhar"
                    required="required"
                    min='12'
                    max='12'
                    eventHandler={validateAadgar}
                    useref={empAadharNo}
                    errorMsg="Enter Aadhar No"
                    errorMgsId="aadharError"
                    errorUseref={empAadharNoErro}
                />

                <InputText
                    htmlFor="empLocalID"
                    star="*"
                    labelName="Local ID"
                    type="text"
                    idName="empLocalID"
                    inputName="empLocalID"
                    required="required"
                    eventHandler={validateLocalId}
                    useref={empLocalId}
                    errorMsg="Enter Local ID"
                    errorMgsId="localIdError"
                    errorUseref={empLocalIdErro}
                />
            </div>

            {/* Basic Information Ends */}

            <Button
                btnType="button"
                btnID="basicInfoBtn"
                btnClass="btn primery"
                btnText="Next"
                clickHandler={basicInfoNext}
            />
        </div>
    );
}