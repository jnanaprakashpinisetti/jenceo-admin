import React from 'react'
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';
import CheckBox from '../formElements/CheckBox';

export default function HealthDetails() {
    return (
        <div id='healthDetails'>
            <div className='checkBoxWrapper'>
                <div className="row">
                    <CheckBox
                        checkBoxID="bp"
                        checkBoxName="bp"
                        labelHtmlFor="bp"
                        checkBoxValue="bp"
                        checkBoxLabelName="B.P"
                    />
                    <CheckBox
                        checkBoxID="sugar"
                        checkBoxName="sugar"
                        labelHtmlFor="sugar"
                        checkBoxValue="sugar"
                        checkBoxLabelName="Sugar"
                    />
                    <CheckBox
                        checkBoxID="thyroid"
                        checkBoxName="thyroid"
                        labelHtmlFor="thyroid"
                        checkBoxValue="thyroid"
                        checkBoxLabelName="Thyroid"
                    />

                </div>
                <div className="row">
                    <CheckBox
                        checkBoxID="skinAllergy"
                        checkBoxName="skinAllergy"
                        labelHtmlFor="skinAllergy"
                        checkBoxValue="skinAllergy"
                        checkBoxLabelName="Skin Allergy"
                    />
                    <CheckBox
                        checkBoxID="fits"
                        checkBoxName="fits"
                        labelHtmlFor="fits"
                        checkBoxValue="fits"
                        checkBoxLabelName="Fits"
                    />
                    <CheckBox
                        checkBoxID="sight"
                        checkBoxName="sight"
                        labelHtmlFor="sight"
                        checkBoxValue="sight"
                        checkBoxLabelName="Sight"
                    />
                </div>

                <div className="row">
                    <CheckBox
                        checkBoxID="duff"
                        checkBoxName="duff"
                        labelHtmlFor="duff"
                        checkBoxValue="duff"
                        checkBoxLabelName="Duff"
                    />

                    <CheckBox
                        checkBoxID="dump"
                        checkBoxName="dump"
                        labelHtmlFor="dump"
                        checkBoxValue="dump"
                        checkBoxLabelName="Dump"
                    />
                </div>


            </div>
            <div className="row">
                <InputText
                    htmlFor="otherIssues"
                    // star="*"
                    labelName="Other Issues"
                    type="text"
                    idName="otherIssues"
                    inputName="otherIssues"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

            </div>
            <Button
                btnType="button"
                btnID="healthNextBtn"
                btnClass="btn primery"
                btnText="Next"
                 // clickHandler = {}
            />

            <Button
                btnType="button"
                btnID="healthPreBtn"
                btnClass="btn primery"
                btnText="Previous"
                 // clickHandler = {}
            />

        </div>
    )
}
