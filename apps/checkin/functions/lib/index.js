"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const USERS_COLLECTION = "users";
exports.writeAuditLog = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const email = request.auth.token.email;
    if (!email) {
        throw new https_1.HttpsError("unauthenticated", "Email not found in auth token.");
    }
    // Verify user is authorized (exists in users with a role)
    const usersSnapshot = await db
        .collection(USERS_COLLECTION)
        .where("email", "==", email)
        .limit(1)
        .get();
    if (usersSnapshot.empty) {
        throw new https_1.HttpsError("permission-denied", "Not authorized.");
    }
    const userData = usersSnapshot.docs[0].data();
    if (!userData.role) {
        throw new https_1.HttpsError("permission-denied", "Not authorized.");
    }
    const { userName, action, targetType, targetId, targetName, changes } = request.data;
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
//# sourceMappingURL=index.js.map