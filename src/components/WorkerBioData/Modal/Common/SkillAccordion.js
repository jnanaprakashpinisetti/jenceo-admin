import React, { useState } from "react";

const SkillAccordion = ({ idPrefix, sections, selected = [], onToggle }) => {
    const [open, setOpen] = useState({});
    const toggleOpen = (k) => setOpen((p) => ({ ...p, [k]: !p[k] }));
    const isSelected = (s) => selected.includes(s);

    return (
        <div className="accordion" id={`${idPrefix}-acc`}>
            {sections.map((sec, idx) => {
                const key = `${idPrefix}-${idx}`;
                const activeCount = sec.skills.filter(isSelected).length;
                return (
                    <div className="accordion-item" key={key}>
                        <h2 className="accordion-header">
                            <button
                                className={`accordion-button collapsed text-${sec.color}`}
                                type="button"
                                onClick={() => toggleOpen(key)}
                                aria-expanded={!!open[key]}
                            >
                                <strong className={`me-2 text-${sec.color}`}>●</strong>
                                {sec.title}
                                {activeCount > 0 && (
                                    <span className="badge ms-2 bg-outline border small-text">
                                        {activeCount} selected
                                    </span>
                                )}
                            </button>
                        </h2>
                        <div className={`accordion-collapse collapse ${open[key] ? "show" : ""}`}>
                            <div className="accordion-body">
                                <div className="d-flex flex-wrap gap-2">
                                    {sec.skills.map((sk) => {
                                        const active = isSelected(sk);
                                        return (
                                            <button
                                                type="button"
                                                key={sk}
                                                className={`btn btn-sm rounded-pill ${active ? `btn-${sec.color}` : `btn-outline-${sec.color}`
                                                    }`}
                                                onClick={() => onToggle(sk)}
                                            >
                                                {sk}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default SkillAccordion;