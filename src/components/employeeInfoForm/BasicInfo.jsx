import React from 'react'
import InputText from '../formElements/InputText';
import InputRadio from '../formElements/InputRadio';
import InputDate from '../formElements/InputDate';
import Button from '../formElements/Button';

export default function BasicInfo() {
    return (
        <div id="empBasicInfo">
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
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

                {/*** Last Name ***/}

                <InputText
                    htmlFor="empLastName"
                    star="*"
                    labelName="Last Name"
                    type="text"
                    idName="empLastName"
                    inputName="empLastName"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

            </div>

            {/**** Gender ****/}
            <div className="row">
                <label className='form-label'>
                    <span className='star'>* </span>
                    Gender</label>
                <div className="col">
                    <InputRadio
                        idName="empMale"
                        inputName="empGender"
                        value="empMale"
                        labelName="Male"
                        htmlFor="empMale"
                    />
                    <InputRadio
                        idName="empFemale"
                        inputName="empGender"
                        value="empFemale"
                        labelName="Female"
                        htmlFor="empFemale"
                    />
                    <InputRadio
                        idName="empOthers"
                        inputName="empGender"
                        value="empFOthers"
                        labelName="Others"
                        htmlFor="empFOthers"
                    />
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
                    // value ="emp"
                    minDate="1965-01-01"
                    maxDate="2007-01-01"
                // changeHandler ="emp"
                // blurHandler ="emp"
                />

                <InputText
                    htmlFor="empYears"
                    star="*"
                    labelName="Years"
                    type="number"
                    idName="empYears"
                    inputName="empYears"
                    // inputVal=""
                    required="required"
                    min='18'
                    max='60'
                // eventHandler = ""
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
                    // inputVal=""
                    required="required"
                // eventHandler = ""
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
                    // inputVal=""
                    required="required"
                    min='10'
                    max='10'
                // eventHandler = ""
                />
                <InputText
                    htmlFor="empMob2"
                    // star="*"
                    labelName="Mobile No-2"
                    type="number"
                    idName="empMob2"
                    inputName="empMob2"
                    // inputVal=""
                    required={false}
                    min='10'
                    max='10'
                // eventHandler = ""
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
                    // inputVal=""
                    required="required"
                    min='12'
                    max='12'
                // eventHandler = ""
                />

                <InputText
                    htmlFor="empLocalID"
                    star="*"
                    labelName="Local ID"
                    type="text"
                    idName="empLocalID"
                    inputName="empLocalID"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

            </div>

            {/* Basic Information Ends */}

            <Button
                btnType="button"
                btnID="basicInfoBtn"
                btnClass="btn primery"
                btnText="Next"
            />

        </div>


    )
}
