import React from 'react'

export default function InputRadio(props) {

    const {
        idName,
        inputName,
        value,
        changeHandler,
        labelName,
        htmlFor

    } = props
    return (
        <>
            <div className="form-check form-check-inline">
                <input type="radio" 
                className="form-check-input" 
                id={idName} 
                name={inputName} 
                value={value} 
                onChange={changeHandler} /> 
                {labelName}
                
                <label 
                className="form-check-label" 
                htmlFor={htmlFor}> 
                </label>
            </div>
        </>
    )
}
