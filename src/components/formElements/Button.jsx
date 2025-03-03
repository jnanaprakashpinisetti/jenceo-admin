import React from 'react'

export default function Button(props) {

    const {
        btnType,
        btnID,
        btnClass,
        clickHandler,
        btnText,
    } = props
    return (
        <>
            <button
                type={btnType}
                id={btnID}
                className={btnClass}
                onClick={clickHandler}>
                {btnText}
            </button>
        </>
    )
}
