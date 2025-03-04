import React from 'react'
import Skills from './Skills';
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';


export default function QualificationSkills({ onQualificationNext, onQualificationPrevious }) {

    let qualificationNext = () => {
        onQualificationNext()

    }
    let qualificationPrevious = () => {
        onQualificationPrevious()

    }

    return (
        <div id='qualificationSkills'>
            <h4>5. Qualification & Skills Details</h4>
            <hr></hr>
            <div className="row">
                {/* Qualification */}
                <InputText
                    htmlFor="qualification"
                    star="*"
                    labelName="Qualification"
                    type="text"
                    idName="qualification"
                    inputName="qualification"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="school"
                    star="*"
                    labelName="School / Collage"
                    type="text"
                    idName="school"
                    inputName="school"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />
            </div>
            <div className="row">

                <InputText
                    htmlFor="primarySkill"
                    star="*"
                    labelName="Primary Skill"
                    type="text"
                    idName="primarySkill"
                    inputName="primarySkill"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="workExp"
                    star="*"
                    labelName="Work Experaince"
                    type="number"
                    idName="workExp"
                    inputName="workExp"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

            </div>

            <Skills />

            <div className="row">
                <InputText
                    htmlFor="motherTung"
                    star="*"
                    labelName="Mother Tung"
                    type="text"
                    idName="motherTung"
                    inputName="motherTung"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="languages"
                    star="*"
                    labelName="Languages"
                    type="text"
                    idName="languages"
                    inputName="languages"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />
            </div>

            <Button
                btnType="button"
                btnID="qualificationNextBtn"
                btnClass="btn primery"
                btnText="Next"
                clickHandler={qualificationNext}
            />

            <Button
                btnType="button"
                btnID="qualificationPreBtn"
                btnClass="btn primery"
                btnText="Previous"
                clickHandler={qualificationPrevious}
            />


        </div>
    )
}
