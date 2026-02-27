import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

admin.initializeApp();
const firestore = admin.firestore();

/**
 * Delete a user and cascade-delete all related documents.
 * Only admins can call this function.
 */
export const deleteUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated");
  }

  // Verify caller is admin
  const callerDoc = await firestore.doc(`users/${request.auth.uid}`).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete users");
  }

  const { uid } = request.data;
  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "uid is required");
  }

  const batch = firestore.batch();

  // Delete user's applications
  const applications = await firestore
    .collection("applications")
    .where("userId", "==", uid)
    .get();
  applications.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete memos authored by user
  const memos = await firestore
    .collection("memos")
    .where("authorId", "==", uid)
    .get();
  memos.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete recommendations by leader
  const recommendations = await firestore
    .collection("recommendations")
    .where("leaderId", "==", uid)
    .get();
  recommendations.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete comments authored by user
  const comments = await firestore
    .collection("recommendation-comments")
    .where("authorId", "==", uid)
    .get();
  comments.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete stake/ward change requests by user
  const changeRequests = await firestore
    .collection("stakeWardChangeRequests")
    .where("userId", "==", uid)
    .get();
  changeRequests.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete user document
  batch.delete(firestore.doc(`users/${uid}`));

  await batch.commit();

  // Delete Firebase Auth user
  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    // User may not exist in Auth (already deleted)
    console.warn("Could not delete auth user:", error);
  }

  return { success: true };
});

/**
 * Approve or reject a stake/ward change request.
 * Cascades updates to user, applications, and recommendations.
 */
export const approveStakeWardChange = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated");
  }

  const { requestId, approved } = request.data;
  if (!requestId || typeof approved !== "boolean") {
    throw new HttpsError("invalid-argument", "requestId and approved are required");
  }

  // Verify caller has permission
  const callerDoc = await firestore.doc(`users/${request.auth.uid}`).get();
  const callerRole = callerDoc.data()?.role;
  if (!["admin", "stake_president"].includes(callerRole)) {
    throw new HttpsError("permission-denied", "Insufficient permissions");
  }

  const requestDoc = await firestore.doc(`stakeWardChangeRequests/${requestId}`).get();
  if (!requestDoc.exists) {
    throw new HttpsError("not-found", "Request not found");
  }

  const requestData = requestDoc.data()!;
  if (requestData.status !== "pending") {
    throw new HttpsError("failed-precondition", "Request already processed");
  }

  if (!approved) {
    await requestDoc.ref.update({
      status: "rejected",
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: request.auth.uid,
      approvedByName: callerDoc.data()?.name || "",
    });
    return { success: true };
  }

  const batch = firestore.batch();

  // Update request status
  batch.update(requestDoc.ref, {
    status: "approved",
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedBy: request.auth.uid,
    approvedByName: callerDoc.data()?.name || "",
  });

  // Update user's stake/ward
  batch.update(firestore.doc(`users/${requestData.userId}`), {
    stake: requestData.requestedStake,
    ward: requestData.requestedWard,
    pendingStake: admin.firestore.FieldValue.delete(),
    pendingWard: admin.firestore.FieldValue.delete(),
  });

  // Cascade update applications
  const apps = await firestore
    .collection("applications")
    .where("userId", "==", requestData.userId)
    .get();
  apps.docs.forEach((doc) => {
    batch.update(doc.ref, {
      stake: requestData.requestedStake,
      ward: requestData.requestedWard,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // Cascade update recommendations
  const recs = await firestore
    .collection("recommendations")
    .where("leaderId", "==", requestData.userId)
    .get();
  recs.docs.forEach((doc) => {
    batch.update(doc.ref, {
      stake: requestData.requestedStake,
      ward: requestData.requestedWard,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return { success: true };
});
