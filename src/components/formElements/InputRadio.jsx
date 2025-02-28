import React from 'react'

export default function InputRadio(props) {
    return (
        <>
            <div className="form-check form-check-inline">
                <input type="radio" className="form-check-input" id={props.idName} name={props.inputName} value={props.value} onChange={props.changeHandler}/> {props.labelName}   
                <label className="form-check-label" htmlFor={props.htmlFor}> </label>
            </div>
        </>
    )
}
