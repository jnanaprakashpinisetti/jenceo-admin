import React, { useState, useEffect, useRef } from "react";

const MultiSelectDropdown = ({ label, options, value = [], onChange, btnClass = "btn-outline-info" }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const h = (e) => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [open]);

    const toggle = (opt) => {
        const has = value.includes(opt);
        onChange(has ? value.filter((x) => x !== opt) : [...value, opt]);
    };

    return (
        <div className="dropdown" ref={ref}>
            <button className={`btn w-100 ${btnClass} dropdown-toggle`} type="button" onClick={() => setOpen(!open)}>
                {value.length > 0 ? `${label} (${value.length})` : label}
            </button>
            {open && (
                <div className="dropdown-menu dropdown-menu-white p-3 show" style={{ width: "100%" }}>
                    <h6 className="text-info mb-2">Select {label}</h6>
                    <div className="dropdown-divider"></div>
                    <div style={{ width: "100%", maxHeight: 220, overflowY: "auto" }}>
                        {options.map((opt) => {
                            const id = `ms-${label}-${opt}`;
                            const checked = value.includes(opt);
                            return (
                                <div className="form-check" key={opt}>
                                    <input
                                        className="form-check-input text-dark"
                                        type="checkbox"
                                        id={id}
                                        checked={checked}
                                        onChange={(e) => toggle(opt)}
                                    />
                                    <label className="form-check-label text-dark" htmlFor={id}>{opt}</label>
                                </div>
                            );
                        })}
                    </div>
                    <div className="dropdown-divider mt-2"></div>
                    <div className="d-flex justify-content-between">
                        <button className="btn btn-sm btn-warning" onClick={() => onChange([])}>Clear</button>
                        <button className="btn btn-sm btn-info" onClick={() => setOpen(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;