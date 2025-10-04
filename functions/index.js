// functions/index.js  (CommonJS + v2, with Admin SDK)
const { setGlobalOptions } = require('firebase-functions/v2/options');
const { onRequest } = require('firebase-functions/v2/https');
const functions = require('firebase-functions');

setGlobalOptions({
  region: 'asia-south1',
  timeoutSeconds: 60,
  memory: '256MiB',
});

exports.ping = functions.https.onRequest((req, res) => {
  res.status(200).send('ok');
});

// --- Minimal HTTPS functions from Steps 1–3 ---
exports.ping = onRequest((req, res) => {
  res.status(200).send('ok');
});

exports.helloWorld = onRequest((req, res) => {
  res.json({ message: 'Hello from Firebase!' });
});

// --- STEP 4: Introduce Admin SDK (paste this block in this file) ---
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();

// Simple Admin check endpoint (no DB calls yet)
exports.info = onRequest((req, res) => {
  const app = admin.app();
  res.json({
    projectId: app.options.projectId || process.env.GCLOUD_PROJECT || null,
    databaseURL: app.options.databaseURL || null,
  });
});
