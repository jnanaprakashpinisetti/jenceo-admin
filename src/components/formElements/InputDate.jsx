import React from 'react'

export default function InputDate(props) {
    const {
        htmlFor,
        star,
        labelName,
        idName,
        inputName,
        required,
        value,
        minDate,
        maxDate,
        changeHandler,
        blurHandler,
        useref,
        errorMsg

    } = props
    return (
        <div className="col">
            <label htmlFor={htmlFor}
                className="form-label">
                <span className="star">{star}</span>
                {labelName}
            </label>
            <input
                type="date"
                className="form-control"
                id={idName}
                name={inputName}
                required={required}
                value={value}
                min={minDate}
                max={maxDate}
                onChange={changeHandler}
                onBlur={blurHandler}
                ref={useref} />
            <p className='error-msg'> {errorMsg}</p>
        </div>
    )
}
