import React from 'react'

export default function Button(props) {
    return (
        <>
            <button type={props.btnType} id={props.btnID} className={props.btnClass} onClick={props.clickHandler}>{props.btnText}</button>
        </>
    )
}
