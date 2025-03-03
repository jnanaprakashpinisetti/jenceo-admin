export default function InputText(props) {
    const {
        htmlFor,
        star,
        labelName,
        type,
        idName,
        inputName,
        inputVal,
        eventHandler,
        required,
        min,
        max,
        maxLength,
        useref,
        errorMgsId,
        errorUseref,
        errorMsg,
    } = props;

    return (
        <div className="col">
            <label htmlFor={htmlFor} className="form-label">
                <span className="star">{star}</span>
                {labelName}
            </label>
            <input
                type={type}
                className="form-control"
                id={idName}
                name={inputName}
                value={inputVal}
                onBlur={eventHandler}
                required={required}
                min={min}
                max={max}
                maxLength={maxLength}
                ref={useref}
            />
            <p className="error-msg" id={errorMgsId} ref={errorUseref}>
                {errorMsg}
            </p>
        </div>
    );
}