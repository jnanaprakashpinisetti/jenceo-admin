// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Helper: check if a uid is privileged (admin/owner).
 * Adjust paths to match your DB.
 */
async function isPrivileged(uid) {
  if (!uid) return false;
  try {
    // Your admins map: authentication/admins/{uid}: true
    const adminsSnap = await admin.database().ref(`authentication/admins/${uid}`).get();
    if (adminsSnap.exists() && adminsSnap.val() === true) return true;
  } catch {}
  // Optional Owners map: JenCeo-DataBase/Owners/{uid}: true
  try {
    const ownersSnap = await admin.database().ref(`JenCeo-DataBase/Owners/${uid}`).get();
    if (ownersSnap.exists() && ownersSnap.val() === true) return true;
  } catch {}
  return false;
}

/**
 * RTDB trigger: when an admin queues a request at /AdminRequests/{uid}/{reqId},
 * this function applies rules if action === "APPLY_RULES".
 *
 * Place the draft JSON in /AdminRulesDraft/latest via your app UI.
 */
exports.onAdminRequest = functions.database
  .ref("/AdminRequests/{uid}/{reqId}")
  .onCreate(async (snap, ctx) => {
    const req = snap.val() || {};
    const { action, payload, requestedBy } = req;

    // Only allow privileged users to trigger rules changes
    const ok = await isPrivileged(requestedBy);
    if (!ok) {
      await snap.ref.update({ status: "rejected", reason: "not privileged" });
      return null;
    }

    try {
      if (action !== "APPLY_RULES") {
        await snap.ref.update({ status: "ignored", reason: "unknown action" });
        return null;
      }

      // Get your RTDB URL from the Admin SDK config (no env var needed)
      const dbUrl = admin.app().options.databaseURL;
      if (!dbUrl) throw new Error("Missing databaseURL in Admin SDK config.");

      // Get an access token from the default credentials the function runs with
      const token = await admin.credential.applicationDefault().getAccessToken();

      // Apply rules via RTDB REST endpoint
      const res = await fetch(`${dbUrl}/.settings/rules.json?access_token=${token.access_token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Rules PUT failed: ${res.status} ${text}`);
      }

      // Audit log
      await admin.database().ref("AuditLogs").push({
        action: "applyRules",
        byUid: requestedBy || null,
        ts: Date.now(),
        details: { ok: true },
      });

      await snap.ref.update({ status: "applied" });
    } catch (e) {
      await snap.ref.update({ status: "error", reason: e.message || String(e) });
    }

    return null;
  });
