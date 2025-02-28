import React, { useState } from 'react'

export default function InputText(props) {

    return (
        <div className="col">
            <label htmlFor={props.htmlFor} className='form-label'>
                <span className='star'> {props.star} </span>
                {props.labelName}
            </label>
            <input type={props.type} className="form-control" id={props.idName} name={props.inputName} value={props.inputVal} onBlur={props.eventHandler} required={props.required} min={props.min} max={props.max} ref={props.useref}/>
            <p className='error-msg' id={props.errorMgsId} ref={props.errorUseref}> {props.errorMsg}</p>
        </div>
    )
}
