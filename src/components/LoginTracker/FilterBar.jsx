// LoginTracker/FilterBar.jsx
// One reusable filter bar: date presets + calendar (from / to), search, a "More filters" panel,
// and removable chips for everything that is active.
//
//   const date = useDateFilter();
//   <FilterBar date={date} search={q} onSearch={setQ} extra={<>...Sel / CheckBox...</>}
//              extraCount={2} chips={[{ label: 'Search: bob', onRemove: () => setQ('') }]} onClearAll={reset} />
//   rows.filter((r) => inRange(r.time, date.range))
import React, { useState } from 'react';

const ymd = (d) => d.toLocaleDateString('en-CA'); // 2026-11-01, in LOCAL time

export const DATE_PRESETS = [
    { value: 'all', label: 'All time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'month', label: 'This month' },
];

export const presetRange = (key) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const back = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
    switch (key) {
        case 'today': return { start: ymd(today), end: ymd(today) };
        case 'yesterday': return { start: ymd(back(1)), end: ymd(back(1)) };
        case '7d': return { start: ymd(back(6)), end: ymd(today) };
        case '30d': return { start: ymd(back(29)), end: ymd(today) };
        case 'month': return { start: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), end: ymd(today) };
        default: return { start: '', end: '' };
    }
};

/** True when time t (ms) is inside the range. Either end may be empty; reversed dates are swapped. */
export const inRange = (t, range) => {
    let { start, end } = range || {};
    if (!start && !end) return true;
    if (!t) return false;
    if (start && end && start > end) [start, end] = [end, start];
    if (start && t < new Date(`${start}T00:00:00`).getTime()) return false;
    if (end && t > new Date(`${end}T23:59:59.999`).getTime()) return false;
    return true;
};

export const dateLabel = (date) => {
    if (date.quick !== 'custom') return (DATE_PRESETS.find((p) => p.value === date.quick) || {}).label || '';
    return `${date.range.start || '…'} → ${date.range.end || '…'}`;
};

export function useDateFilter() {
    const [s, setS] = useState({ quick: 'all', start: '', end: '' });
    return {
        range: { start: s.start, end: s.end },
        quick: s.quick,
        active: !!(s.start || s.end),
        setQuick: (key) => setS({ quick: key, ...presetRange(key) }),
        setStart: (v) => setS((p) => ({ ...p, quick: 'custom', start: v })),
        setEnd: (v) => setS((p) => ({ ...p, quick: 'custom', end: v })),
        clear: () => setS({ quick: 'all', start: '', end: '' }),
    };
}

const field = 'form-control form-control-sm bg-dark text-white border-secondary';

/** Labelled dropdown for the "More filters" panel. options: strings or { value, label }. */
export const Sel = ({ label, value, onChange, options, allLabel = 'All' }) => (
    <div className="col-6 col-md-3 col-lg-2">
        <label className="form-label small text-warning mb-1">{label}</label>
        <select className="form-select form-select-sm bg-dark text-white border-secondary" value={value} onChange={(e) => onChange(e.target.value)}>
            {allLabel !== null && <option value="all">{allLabel}</option>}
            {options.map((o) => (typeof o === 'string'
                ? <option key={o} value={o}>{o}</option>
                : <option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
    </div>
);

export const CheckBox = ({ label, checked, onChange }) => (
    <div className="col-6 col-md-3 col-lg-2 d-flex align-items-end">
        <label className="d-flex align-items-center gap-2 text-light small mb-1" style={{ cursor: 'pointer' }}>
            <input type="checkbox" className="form-check-input mt-0" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    </div>
);

export default function FilterBar({
    date, search, onSearch, placeholder = 'Search...', extra = null, extraCount = 0,
    chips = [], onClearAll, actions = null, summary = null,
}) {
    const [open, setOpen] = useState(false);
    const dateStyle = { colorScheme: 'dark' };

    return (
        <div className="card bg-dark border-secondary mb-3">
            <div className="card-body py-3">
                <div className="row g-2 align-items-end">
                    <div className="col-6 col-lg-2">
                        <label className="form-label small text-warning mb-1">Date range</label>
                        <select className="form-select form-select-sm bg-dark text-white border-secondary" value={date.quick} onChange={(e) => date.setQuick(e.target.value)}>
                            {DATE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            {date.quick === 'custom' && <option value="custom">Custom range</option>}
                        </select>
                    </div>
                    <div className="col-6 col-lg-2">
                        <label className="form-label small text-warning mb-1">From</label>
                        <input type="date" className={field} style={dateStyle} value={date.range.start} onChange={(e) => date.setStart(e.target.value)} />
                    </div>
                    <div className="col-6 col-lg-2">
                        <label className="form-label small text-warning mb-1">To</label>
                        <input type="date" className={field} style={dateStyle} value={date.range.end} onChange={(e) => date.setEnd(e.target.value)} />
                    </div>
                    <div className="col-6 col-lg-3">
                        <label className="form-label small text-warning mb-1">Search</label>
                        <div className="input-group input-group-sm">
                            <span className="input-group-text bg-dark text-info border-secondary"><i className="bi bi-search" /></span>
                            <input type="text" className={field} placeholder={placeholder} value={search} onChange={(e) => onSearch(e.target.value)} />
                            {search && <button type="button" className="btn btn-outline-secondary" onClick={() => onSearch('')} aria-label="Clear search"><i className="bi bi-x-lg" /></button>}
                        </div>
                    </div>
                    <div className="col-12 col-lg-3 d-flex gap-2 justify-content-lg-end flex-wrap">
                        {extra && (
                            <button type="button" className={`btn btn-sm ${open ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setOpen((o) => !o)}>
                                <i className="bi bi-funnel me-1" />More filters
                                {extraCount > 0 && <span className="badge bg-warning text-dark ms-2">{extraCount}</span>}
                            </button>
                        )}
                        {actions}
                    </div>
                </div>

                {extra && open && <div className="row g-2 mt-2 pt-3 border-top border-secondary">{extra}</div>}

                {(chips.length > 0 || summary) && (
                    <div className="d-flex align-items-center flex-wrap gap-2 mt-3">
                        {summary && <small className="text-muted me-2">{summary}</small>}
                        {chips.map((c) => (
                            <span key={c.label} className="badge rounded-pill bg-info text-dark d-inline-flex align-items-center gap-2 ps-3 pe-2 py-2">
                                {c.label}
                                <button type="button" className="btn-close" style={{ fontSize: 9 }} aria-label={`Remove filter ${c.label}`} onClick={c.onRemove} />
                            </span>
                        ))}
                        {chips.length > 0 && <button type="button" className="btn btn-link btn-sm text-warning p-0 ms-1" onClick={onClearAll}>Clear all</button>}
                    </div>
                )}
            </div>
        </div>
    );
}
