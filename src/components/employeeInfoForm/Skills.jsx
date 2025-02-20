import React from 'react'
import CheckBox from '../formElements/CheckBox';

export default function Skills() {
    return (
        <div className='checkBoxWrapper'>

            <div className="row">
                <CheckBox
                    checkBoxID="cook"
                    checkBoxName="cook"
                    labelHtmlFor="cook"
                    checkBoxValue="cook"
                    checkBoxLabelName="Cook"
                />
                <CheckBox
                    checkBoxID="babyCar"
                    checkBoxName="babyCar"
                    labelHtmlFor="babyCar"
                    checkBoxValue="babyCar"
                    checkBoxLabelName="Bab yCar"
                />
                <CheckBox
                    checkBoxID="houseMade"
                    checkBoxName="houseMade"
                    labelHtmlFor="houseMade"
                    checkBoxValue="houseMade"
                    checkBoxLabelName="House Made"
                />

            </div>

            <div className="row">
                <CheckBox
                    checkBoxID="nursing"
                    checkBoxName="nursing"
                    labelHtmlFor="nursing"
                    checkBoxValue="nursing"
                    checkBoxLabelName="Nursing"
                />
                <CheckBox
                    checkBoxID="elderCare"
                    checkBoxName="elderCare"
                    labelHtmlFor="elderCare"
                    checkBoxValue="elderCare"
                    checkBoxLabelName="Elder Care"
                />
            </div>

            <div className="row">
                <CheckBox
                    checkBoxID="bedsideAyaa"
                    checkBoxName="bedsideAyaa"
                    labelHtmlFor="bedsideAyaa"
                    checkBoxValue="bedsideAyaa"
                    checkBoxLabelName="Bedside Ayaa"
                />
                <CheckBox
                    checkBoxID="others"
                    checkBoxName="others"
                    labelHtmlFor="others"
                    checkBoxValue="others"
                    checkBoxLabelName="Others"
                />
            </div>

        </div>
    )
}
