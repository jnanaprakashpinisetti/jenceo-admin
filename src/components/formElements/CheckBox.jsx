import React from 'react'

export default function CheckBox(props) {
    return (
        <div class="form-check form-check-inline checkBox">
            <input className="form-check-input" type="checkbox" id={props.checkBoxID} name={props.checkBoxName} value={props.checkBoxValue} checked={props.checked} />
            <label className="form-check-label" htmlFor={props.labelHtmlFor}>{props.checkBoxLabelName}</label>
        </div>
    )
}
