"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const ADMINS_COLLECTION = "checkin_admins";
const AUDIT_LOGS_COLLECTION = "audit_logs";
const VALID_ACTIONS = [
    "create", "update", "delete", "check_in", "check_out", "assign", "import",
];
const VALID_TARGET_TYPES = [
    "participant", "group", "room", "bus",
];
exports.writeAuditLog = (0, https_1.onCall)(async (request) => {
    // Require authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const email = request.auth.token.email;
    if (!email) {
        throw new https_1.HttpsError("unauthenticated", "Email not found in auth token.");
    }
    // Verify user is authorized (exists in checkin_admins)
    const adminDoc = await db.collection(ADMINS_COLLECTION).doc(email).get();
    if (!adminDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "Not authorized.");
    }
    const { userName, action, targetType, targetId, targetName, changes } = request.data;
    // Validate required fields
    if (!action || !targetType || !targetId || !targetName) {
        throw new https_1.HttpsError("invalid-argument", "Missing required fields: action, targetType, targetId, targetName.");
    }
    if (!VALID_ACTIONS.includes(action)) {
        throw new https_1.HttpsError("invalid-argument", `Invalid action: ${action}`);
    }
    if (!VALID_TARGET_TYPES.includes(targetType)) {
        throw new https_1.HttpsError("invalid-argument", `Invalid targetType: ${targetType}`);
    }
    // Write audit log with server-verified email
    const entry = {
        timestamp: firestore_1.FieldValue.serverTimestamp(),
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
//# sourceMappingURL=index.js.map