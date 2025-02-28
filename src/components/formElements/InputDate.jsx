import React from 'react'

export default function InputDate(props) {
    return (
        <div className="col">
            <label htmlFor={props.htmlFor} className="form-label"><span className="star">{props.star}</span>{props.labelName}</label>
            <input type="date" className="form-control" id={props.idName} name={props.inputName} required={props.required} value={props.value} min={props.minDate} max={props.maxDate} onChange={props.changeHandler} onBlur={props.blurHandler} ref={props.useref}/>
            <p className='error-msg'> {props.errorMsg}</p>
        </div>
    )
}
