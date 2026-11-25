
const fs = require("fs");
const path = require("path");

const { initializeApp, cert, deleteApp } =
  require("firebase-admin/app");

const { getAuth } = require("firebase-admin/auth");

// Exact service account filename
const keyPath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(keyPath)) {
  throw new Error(
    "serviceAccountKey.json not found. Check the filename."
  );
}

const serviceAccount = require(keyPath);

if (serviceAccount.project_id !== "jenceo-admin") {
  throw new Error("Incorrect Firebase project ID.");
}

// Initialize Firebase Admin using modular API
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const auth = getAuth(app);

const CONFIRM_DELETE = "DELETE_ANONYMOUS_USERS";

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

async function getAnonymousCandidates() {
  let pageToken;
  const candidates = [];

  do {
    const result = await auth.listUsers(1000, pageToken);

    for (const user of result.users) {
      const noLinkedProviders =
        user.providerData.length === 0;

      const noCustomClaims =
        Object.keys(user.customClaims || {}).length === 0;

      if (noLinkedProviders && noCustomClaims) {
        candidates.push(user);
      }
    }

    pageToken = result.pageToken;

  } while (pageToken);

  return candidates;
}

async function main() {
  console.log("----------------------------------");
  console.log("JENCEO FIREBASE USER CLEANUP");
  console.log("----------------------------------");

  console.log("Project:", serviceAccount.project_id);

  const users = await getAnonymousCandidates();

  console.log("\nCandidate accounts:", users.length);

  if (users.length === 0) {
    console.log("No candidate accounts found.");
    return;
  }

  // Create a review report
  const rows = [
    ["UID", "Creation Date", "Last Sign In"]
  ];

  users.forEach(user => {
    rows.push([
      user.uid,
      user.metadata.creationTime,
      user.metadata.lastSignInTime
    ]);
  });

  const csv = rows
    .map(row => row.map(csvEscape).join(","))
    .join("\n");

  const reportPath = path.join(
    __dirname,
    "anonymous-users-review.csv"
  );

  fs.writeFileSync(reportPath, csv, "utf8");

  console.log("\nReview report created:");
  console.log(reportPath);

  console.log("\nFirst 10 candidate UIDs:");

  users.slice(0, 10).forEach((user, index) => {
    console.log(`${index + 1}. ${user.uid}`);
  });

  // Safe default: dry run only
  if (process.env.CONFIRM_DELETE !== CONFIRM_DELETE) {
    console.log("\nDRY RUN COMPLETED.");
    console.log("No users have been deleted.");
    console.log("Review anonymous-users-review.csv first.");

    return;
  }

  console.log("\nStarting deletion...");

  let deleted = 0;
  let failed = 0;

  // Maximum 1000 UIDs per Firebase deletion request
  for (let i = 0; i < users.length; i += 1000) {
    const batch = users.slice(i, i + 1000);

    const result = await auth.deleteUsers(
      batch.map(user => user.uid)
    );

    deleted += result.successCount;
    failed += result.failureCount;

    console.log(
      `Batch ${Math.floor(i / 1000) + 1}: ` +
      `${result.successCount} deleted, ` +
      `${result.failureCount} failed`
    );

    result.errors.forEach(error => {
      console.error(
        "Failed UID:",
        batch[error.index]?.uid,
        error.error.message
      );
    });
  }

  console.log("\n========== FINAL REPORT ==========");
  console.log("Total candidates:", users.length);
  console.log("Successfully deleted:", deleted);
  console.log("Failed:", failed);
  console.log("==================================");
}

main()
  .catch(error => {
    console.error("\nFirebase cleanup error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await deleteApp(app);
  });
