import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

const USERS_COLLECTION = "users";

export const writeAuditLog = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const email = request.auth.token.email;
  if (!email) {
    throw new HttpsError("unauthenticated", "Email not found in auth token.");
  }

  // Verify user is authorized (exists in users with a role)
  const usersSnapshot = await db
    .collection(USERS_COLLECTION)
    .where("email", "==", email)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    throw new HttpsError("permission-denied", "Not authorized.");
  }

  const userData = usersSnapshot.docs[0].data();
  if (!userData.role) {
    throw new HttpsError("permission-denied", "Not authorized.");
  }

  const { userName, action, targetType, targetId, targetName, changes } =
    request.data;

  console.log("[AuditLog]", {
    userName: userName || "Unknown",
    userEmail: email,
    action,
    targetType,
    targetId: String(targetId),
    targetName: String(targetName),
    changes: changes || null,
  });

  return { success: true };
});
