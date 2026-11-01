// LoginTracker/ConfirmDialog.jsx
// Replaces window.confirm / alert everywhere.
//
//   const [confirm, dialog] = useConfirm();
//   ...
//   const ok = await confirm({ title: 'Block this IP?', message: '...', tone: 'danger', confirmText: 'Block' });
//   // with extra inputs:
//   const res = await confirm({ ..., askReason: true, askDuration: true });
//   if (res) { res.reason; res.expiresAt /* ISO string or null */ }
//   ...
//   return (<>...{dialog}</>);
//
// For a message with a single OK button use hideCancel: true.
import React, { useCallback, useEffect, useState } from 'react';

export const DURATIONS = [
    { label: 'Permanent', ms: 0 },
    { label: '1 hour', ms: 3600e3 },
    { label: '24 hours', ms: 24 * 3600e3 },
    { label: '7 days', ms: 7 * 86400e3 },
    { label: '30 days', ms: 30 * 86400e3 },
];

const TONES = {
    danger: { btn: 'btn-danger', icon: 'bi-exclamation-octagon-fill', color: '#dc3545' },
    warning: { btn: 'btn-warning', icon: 'bi-exclamation-triangle-fill', color: '#ffc107' },
    success: { btn: 'btn-success', icon: 'bi-check-circle-fill', color: '#198754' },
    info: { btn: 'btn-info', icon: 'bi-info-circle-fill', color: '#0dcaf0' },
    primary: { btn: 'btn-primary', icon: 'bi-question-circle-fill', color: '#0d6efd' },
};

export function ConfirmModal({
    title, message, tone = 'primary', icon, confirmText = 'OK', cancelText = 'Cancel', hideCancel = false,
    askReason = false, askDuration = false, reasonLabel = 'Reason (optional)', busy = false, onConfirm, onCancel, children,
}) {
    const [reason, setReason] = useState('');
    const [duration, setDuration] = useState(0);
    const t = TONES[tone] || TONES.primary;

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') (hideCancel ? onConfirm : onCancel)({}); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [hideCancel, onConfirm, onCancel]);

    const submit = () => onConfirm({
        reason: reason.trim(),
        duration,
        expiresAt: duration ? new Date(Date.now() + duration).toISOString() : null,
    });

    return (
        <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 2000, overflowY: 'auto' }}
            onClick={() => (hideCancel ? submit() : onCancel())}
        >
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content bg-dark text-light border border-secondary rounded-4">
                    <div className="modal-body p-4">
                        <div className="d-flex gap-3">
                            <i className={`bi ${icon || t.icon} fs-2`} style={{ color: t.color, lineHeight: 1 }} />
                            <div className="flex-grow-1">
                                <h5 className="mb-2">{title}</h5>
                                {message && <p className="mb-0 text-light opacity-75" style={{ whiteSpace: 'pre-line' }}>{message}</p>}
                                {children}
                                {askReason && (
                                    <div className="mt-3">
                                        <label className="form-label small text-warning mb-1">{reasonLabel}</label>
                                        <input
                                            className="form-control bg-dark text-white border-secondary"
                                            value={reason}
                                            maxLength={140}
                                            onChange={(e) => setReason(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                )}
                                {askDuration && (
                                    <div className="mt-3">
                                        <label className="form-label small text-warning mb-1">How long?</label>
                                        <select className="form-select bg-dark text-white border-secondary" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                                            {DURATIONS.map((d) => <option key={d.label} value={d.ms}>{d.label}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer border-top border-secondary border-opacity-50">
                        {!hideCancel && <button className="btn btn-outline-light" onClick={onCancel} disabled={busy}>{cancelText}</button>}
                        <button className={`btn ${t.btn}`} onClick={submit} disabled={busy}>{busy ? 'Please wait...' : confirmText}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Promise-style modal. confirm() resolves false (cancelled), true, or { reason, duration, expiresAt }. */
export function useConfirm() {
    const [req, setReq] = useState(null);

    const confirm = useCallback((opts) => new Promise((resolve) => setReq({ opts, resolve })), []);
    const close = (value) => {
        if (req) req.resolve(value);
        setReq(null);
    };
    const dialog = req ? (
        <ConfirmModal
            {...req.opts}
            onConfirm={(v) => close(req.opts.askReason || req.opts.askDuration ? v : true)}
            onCancel={() => close(false)}
        />
    ) : null;

    return [confirm, dialog];
}

export default ConfirmModal;
