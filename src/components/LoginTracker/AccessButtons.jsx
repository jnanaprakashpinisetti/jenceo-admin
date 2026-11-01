// LoginTracker/AccessButtons.jsx
// Allow / Block buttons for an IP or a DEVICE that always show the CURRENT state:
//   blocked  -> the Block button is filled red and says "Blocked" (click again to unblock)
//   allowed  -> the Allow button is filled green and says "Allowed"
// Use once per screen:
//   const actions = useAccessActions({ lists, adminName, notify });
//   ... actions.renderIPButtons(ip)  /  actions.renderDeviceButtons(deviceId, name)
//   ... {actions.dialog}
import React, { useState } from 'react';
import { ipWhitelistManager, deviceAccessManager } from './trackUserLogin';
import { useConfirm } from './ConfirmDialog';
import { normalizeIP } from './ipUtils';

export const StateButtons = ({
    allowed, blocked, allowLabel = 'Allow', allowedLabel = 'Allowed', blockLabel = 'Block', blockedLabel = 'Blocked',
    onAllow, onBlock, allowDisabled, blockDisabled, allowTitle, blockTitle, busy,
}) => {
    const stop = (fn) => (e) => { e.stopPropagation(); if (fn) fn(); };
    return (
        <div className="btn-group btn-group-sm" role="group">
            <button
                type="button"
                className={`btn ${allowed ? 'btn-success' : 'btn-outline-success'}`}
                disabled={busy || allowDisabled}
                title={allowTitle}
                onClick={stop(onAllow)}
            >
                {allowed ? <><i className="bi bi-check-lg me-1" />{allowedLabel}</> : allowLabel}
            </button>
            <button
                type="button"
                className={`btn ${blocked ? 'btn-danger' : 'btn-outline-danger'}`}
                disabled={busy || blockDisabled}
                title={blockTitle}
                onClick={stop(onBlock)}
            >
                {blocked ? <><i className="bi bi-slash-circle me-1" />{blockedLabel}</> : blockLabel}
            </button>
        </div>
    );
};

const until = (e) => (e && e.expiresAt ? ` until ${new Date(e.expiresAt).toLocaleString()}` : '');

export function useAccessActions({ lists, adminName, notify }) {
    const [confirm, dialog] = useConfirm();
    const [busy, setBusy] = useState(false);
    const say = (ok, good, bad) => { if (notify) notify(ok ? 'success' : 'danger', ok ? good : bad); };
    const run = async (fn) => {
        setBusy(true);
        try { await fn(); } finally { setBusy(false); }
    };

    /* ---------------- IP ---------------- */
    const toggleBlockIP = (ip) => run(async () => {
        const st = lists.ipState(ip);
        if (st.blocked) {
            if (st.viaRule) return; // blocked by a range: manage it in Access control
            if (!(await confirm({ title: 'Unblock this IP?', message: `${ip} will be able to open the site again.`, tone: 'success', confirmText: 'Unblock' }))) return;
            const r = st.blockEntry
                ? await ipWhitelistManager.removeFromBlacklist(st.blockEntry.id, adminName)
                : await ipWhitelistManager.toggleIPStatus(st.disabledEntry.id, true, adminName);
            return say(r.success, `${ip} unblocked`, r.error);
        }
        const mine = normalizeIP(ip) === normalizeIP(lists.myIP);
        const res = await confirm({
            title: 'Block this IP?',
            message: `Nobody will be able to open the site from ${ip}.${mine ? '\n\nThis is YOUR current IP. You will be blocked right away.' : ''}`,
            tone: 'danger', confirmText: 'Block IP', askReason: true, askDuration: true,
        });
        if (!res) return;
        const r = await ipWhitelistManager.addToBlacklist(ip, res.reason || 'Blocked by admin', adminName, { expiresAt: res.expiresAt });
        return say(r.success, `${ip} blocked`, r.error);
    });

    const toggleAllowIP = (ip) => run(async () => {
        const st = lists.ipState(ip);
        if (st.allowed) {
            if (!st.allowEntry) return; // allowed by a range rule
            if (!(await confirm({ title: 'Remove from whitelist?', message: `${ip} will no longer be on the whitelist.`, tone: 'warning', confirmText: 'Remove' }))) return;
            const r = await ipWhitelistManager.removeFromWhitelist(st.allowEntry.id, adminName);
            return say(r.success, `${ip} removed from whitelist`, r.error);
        }
        if (st.blocked) {
            if (st.viaRule) return;
            if (st.disabledEntry) {
                const r = await ipWhitelistManager.toggleIPStatus(st.disabledEntry.id, true, adminName);
                return say(r.success, `${ip} allowed`, r.error);
            }
            if (!(await confirm({ title: 'Unblock and allow?', message: `${ip} is blocked. It will be unblocked and added to the whitelist.`, tone: 'success', confirmText: 'Unblock & allow' }))) return;
            await ipWhitelistManager.removeFromBlacklist(st.blockEntry.id, adminName);
        }
        const r = await ipWhitelistManager.addToWhitelist(ip, 'Allowed from admin panel', adminName);
        return say(r.success, `${ip} added to whitelist`, r.error);
    });

    const renderIPButtons = (ip) => {
        const st = lists.ipState(ip);
        const rule = st.blockedBy;
        return (
            <StateButtons
                busy={busy}
                allowed={st.allowed}
                blocked={st.blocked}
                allowDisabled={st.allowViaRule || (st.blocked && st.viaRule)}
                blockDisabled={st.blocked && st.viaRule}
                allowTitle={st.allowViaRule ? 'Allowed by a range rule. Manage it in Access control.' : st.allowed ? 'On the whitelist. Click to remove.' : 'Add to whitelist'}
                blockTitle={st.blocked
                    ? (st.viaRule ? `Blocked by rule ${rule && rule.ip}. Manage it in Access control.` : `Blocked${rule && rule.reason ? `: ${rule.reason}` : ''}${until(rule)}. Click to unblock.`)
                    : 'Block this IP'}
                onAllow={() => toggleAllowIP(ip)}
                onBlock={() => toggleBlockIP(ip)}
            />
        );
    };

    /* ---------------- DEVICE ---------------- */
    const toggleBlockDevice = (deviceId, name, userName) => run(async () => {
        const st = lists.deviceState(deviceId);
        if (st.blocked) {
            if (!(await confirm({ title: 'Unblock this device?', message: `${name || 'This device'} will be able to sign in again.`, tone: 'success', confirmText: 'Unblock' }))) return;
            const r = await deviceAccessManager.setDeviceStatus(deviceId, 'approved', { name, by: adminName, userName });
            return say(r.success, 'Device unblocked', r.error);
        }
        const mine = deviceId === lists.myDeviceId;
        const res = await confirm({
            title: 'Block this device?',
            message: `${name || 'This device'} will not be able to open the site or sign in from ANY network.${mine ? '\n\nThis is the device you are using now. You will be blocked right away.' : ''}`,
            tone: 'danger', confirmText: 'Block device', askReason: true, askDuration: true,
        });
        if (!res) return;
        const r = await deviceAccessManager.setDeviceStatus(deviceId, 'blocked', { name, by: adminName, userName, reason: res.reason || 'Blocked by admin', expiresAt: res.expiresAt });
        return say(r.success, 'Device blocked', r.error);
    });

    const toggleApproveDevice = (deviceId, name, userName) => run(async () => {
        const st = lists.deviceState(deviceId);
        if (st.approved) {
            if (!(await confirm({ title: 'Remove approval?', message: `${name || 'This device'} will need approval again${lists.security.requireDeviceApproval ? ' before it can sign in' : ' (only matters while approval mode is on)'}.`, tone: 'warning', confirmText: 'Remove approval' }))) return;
            const r = await deviceAccessManager.removeDeviceRule(deviceId, adminName);
            return say(r.success, 'Approval removed', r.error);
        }
        if (st.blocked && !(await confirm({ title: 'Unblock and approve?', message: `${name || 'This device'} is blocked. It will be unblocked and approved.`, tone: 'success', confirmText: 'Unblock & approve' }))) return;
        const r = await deviceAccessManager.setDeviceStatus(deviceId, 'approved', { name, by: adminName, userName });
        return say(r.success, 'Device approved', r.error);
    });

    const renderDeviceButtons = (deviceId, name, userName) => {
        const st = lists.deviceState(deviceId);
        const rule = st.rule;
        return (
            <StateButtons
                busy={busy}
                allowed={st.approved && !st.blocked}
                blocked={st.blocked}
                allowLabel="Approve"
                allowedLabel="Approved"
                allowTitle={st.approved ? 'Approved. Click to remove approval.' : 'Approve this device'}
                blockTitle={st.blocked ? `Blocked${rule && rule.reason ? `: ${rule.reason}` : ''}${until(rule)}. Click to unblock.` : 'Block this device on every network'}
                onAllow={() => toggleApproveDevice(deviceId, name, userName)}
                onBlock={() => toggleBlockDevice(deviceId, name, userName)}
            />
        );
    };

    return { dialog, busy, confirm, renderIPButtons, renderDeviceButtons };
}

const STATUS_BADGE = {
    blocked: ['bg-danger', 'Blocked'],
    pending: ['bg-warning text-dark', 'Waiting for approval'],
    approved: ['bg-success', 'Approved'],
    expired: ['bg-secondary', 'Block expired'],
    unapproved: ['bg-warning text-dark', 'Not approved'],
    allowed: ['bg-secondary', 'Allowed'],
};

/** Small coloured label for a device status (from lists.deviceState(id).status). */
export const DeviceStatusBadge = ({ status }) => {
    const [cls, text] = STATUS_BADGE[status] || STATUS_BADGE.allowed;
    return <span className={`badge ${cls}`}>{text}</span>;
};
