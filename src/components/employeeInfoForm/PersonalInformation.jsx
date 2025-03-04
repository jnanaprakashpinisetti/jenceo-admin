import React from 'react'
import InputText from '../formElements/InputText';
import InputRadio from '../formElements/InputRadio';
import InputDate from '../formElements/InputDate';
import Button from '../formElements/Button';

export default function PersonalInformation({ onPermanentAddressNext, onPermanentAddressPrevious }) {

  let personalInformationNext = () => {
    onPermanentAddressNext()

  }
  let personalInformationPrevious = () => {
    onPermanentAddressPrevious()

  }

  return (
    <div id="personalInformation">
      <h4>4. Personal Information</h4>
      <hr></hr>
      {/* Personal Information start */}
      <div className="row">
        <label className='form-label'>
          <span className='star'>* </span>
          Marital Status</label>
        <div className="col">
          <InputRadio
            idName="Married"
            inputName="empMaritalStatus"
            value="Married"
            labelName="Married"
            htmlFor="Married"
          />
          <InputRadio
            idName="unMarried"
            inputName="empMaritalStatus"
            value="unMarried"
            labelName="Un Married"
            htmlFor="unMarried"
          />
          <InputRadio
            idName="single"
            inputName="empMaritalStatus"
            value="single"
            labelName="Single"
            htmlFor="single"
          />
        </div>
      </div>

      <div className="row">
        {/**** Marrige Year ****/}

        <InputDate
          htmlFor="doMarage"
          // star="* "
          labelName="Date Of Marage"
          idName="doMarage"
          inputName="doMarage"
          required={false}
          // value ="emp"
          minDate="1965-01-01"
        // changeHandler =""
        // blurHandler =""
        />

        <InputText
          htmlFor="mrgYears"
          // star="*"
          labelName="Years"
          type="number"
          idName="mrgYears"
          inputName="mrgYears"
          // inputVal=""
          required={false}
          max='50'
        // eventHandler = ""
        />
      </div>

      <div className="row">
        <InputText
          htmlFor="child1"
          // star="*"
          labelName="Child Name-1"
          type="text"
          idName="child1"
          inputName="child1"
          // inputVal=""
          required={false}
        // eventHandler = ""
        />

        <InputText
          htmlFor="child2"
          // star="*"
          labelName="Child Name-2"
          type="text"
          idName="child2"
          inputName="child2"
          // inputVal=""
          required={false}
        // eventHandler = ""
        />
      </div>

      <div className="row">
        <InputText
          htmlFor="relegion"
          star="*"
          labelName="Relegion"
          type="text"
          idName="relegion"
          inputName="Relegion"
          // inputVal=""
          required="required"
        // eventHandler = ""
        />

        <InputText
          htmlFor="cast"
          star="*"
          labelName="Cast"
          type="text"
          idName="cast"
          inputName="cast"
          // inputVal=""
          required="required"
        // eventHandler = ""
        />

      </div>
      <Button
        btnType="button"
        btnID="personalAddressNextBtn"
        btnClass="btn primery"
        btnText="Next"
        clickHandler={personalInformationNext}
      />

      <Button
        btnType="button"
        btnID="personalAddressPreBtn"
        btnClass="btn primery"
        btnText="Previous"
        clickHandler={personalInformationPrevious}
      />

    </div>

  )
}
