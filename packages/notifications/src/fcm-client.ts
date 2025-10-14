import admin from "firebase-admin";

let fcmInitialized = false;

export function initializeFCM() {
  if (fcmInitialized) {
    return;
  }

  try {
    const serviceAccountPath = process.env.FCM_SERVICE_ACCOUNT_PATH;
    const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountPath && !serviceAccountJson) {
      console.warn(
        "⚠️  FCM not configured: Missing FCM_SERVICE_ACCOUNT_PATH or FCM_SERVICE_ACCOUNT_JSON",
      );
      return;
    }

    let serviceAccount;
    if (serviceAccountJson) {
      serviceAccount = JSON.parse(serviceAccountJson);
    } else if (serviceAccountPath) {
      serviceAccount = require(serviceAccountPath);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    fcmInitialized = true;
    console.log("✓ FCM initialized successfully");
  } catch (error) {
    console.error("Failed to initialize FCM:", error);
  }
}

export function getFCM() {
  if (!fcmInitialized) {
    throw new Error("FCM not initialized. Call initializeFCM() first.");
  }
  return admin.messaging();
}

export function isFCMEnabled() {
  return fcmInitialized;
}
