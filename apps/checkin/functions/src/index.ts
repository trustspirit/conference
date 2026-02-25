import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

const ADMINS_COLLECTION = "checkin_admins";
const AUDIT_LOGS_COLLECTION = "audit_logs";

const VALID_ACTIONS = [
  "create", "update", "delete", "check_in", "check_out", "assign", "import",
] as const;

const VALID_TARGET_TYPES = [
  "participant", "group", "room", "bus",
] as const;

export const writeAuditLog = onCall(async (request) => {
  // Require authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const email = request.auth.token.email;
  if (!email) {
    throw new HttpsError("unauthenticated", "Email not found in auth token.");
  }

  // Verify user is authorized (exists in checkin_admins)
  const adminDoc = await db.collection(ADMINS_COLLECTION).doc(email).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Not authorized.");
  }

  const { userName, action, targetType, targetId, targetName, changes } =
    request.data;

  // Validate required fields
  if (!action || !targetType || !targetId || !targetName) {
    throw new HttpsError(
      "invalid-argument",
      "Missing required fields: action, targetType, targetId, targetName."
    );
  }

  if (!VALID_ACTIONS.includes(action)) {
    throw new HttpsError("invalid-argument", `Invalid action: ${action}`);
  }

  if (!VALID_TARGET_TYPES.includes(targetType)) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid targetType: ${targetType}`
    );
  }

  // Write audit log with server-verified email
  const entry = {
    timestamp: FieldValue.serverTimestamp(),
    userName: userName || "Unknown",
    userEmail: email, // Server-verified, cannot be forged
    action,
    targetType,
    targetId: String(targetId),
    targetName: String(targetName),
    changes: changes || null,
  };

  const ref = await db.collection(AUDIT_LOGS_COLLECTION).add(entry);

  return { success: true, id: ref.id };
});
