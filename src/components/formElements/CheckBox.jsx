import React from 'react'

export default function CheckBox(props) {
    const {
        checkBoxID,
        checkBoxName,
        checkBoxValue,
        checked,
        labelHtmlFor,
        checkBoxLabelName,

    } = props
    return (
        <div class="form-check form-check-inline checkBox">
            <input className="form-check-input"
                type="checkbox"
                id={checkBoxID}
                name={checkBoxName}
                value={checkBoxValue}
                checked={checked} />
                
            <label className="form-check-label"
                htmlFor={labelHtmlFor}>{checkBoxLabelName}
            </label>
        </div>
    )
}
