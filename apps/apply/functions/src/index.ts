import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

admin.initializeApp();
const firestore = admin.firestore();

const USERS = "apply_users";
const APPLICATIONS = "apply_applications";
const MEMOS = "apply_memos";
const RECOMMENDATIONS = "apply_recommendations";
const RECOMMENDATION_COMMENTS = "apply_recommendation_comments";
const STAKE_WARD_CHANGE_REQUESTS = "apply_stakeWardChangeRequests";
const CONFERENCES = "apply_conferences";
const POSITIONS = "apply_positions";

/**
 * Delete a user and cascade-delete all related documents.
 * Only admins can call this function.
 */
export const deleteUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated");
  }

  // Verify caller is admin
  const callerDoc = await firestore.doc(`${USERS}/${request.auth.uid}`).get();
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
    .collection(APPLICATIONS)
    .where("userId", "==", uid)
    .get();
  applications.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete memos authored by user
  const memos = await firestore
    .collection(MEMOS)
    .where("authorId", "==", uid)
    .get();
  memos.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete recommendations by leader
  const recommendations = await firestore
    .collection(RECOMMENDATIONS)
    .where("leaderId", "==", uid)
    .get();
  recommendations.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete comments authored by user
  const comments = await firestore
    .collection(RECOMMENDATION_COMMENTS)
    .where("authorId", "==", uid)
    .get();
  comments.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete stake/ward change requests by user
  const changeRequests = await firestore
    .collection(STAKE_WARD_CHANGE_REQUESTS)
    .where("userId", "==", uid)
    .get();
  changeRequests.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete user document
  batch.delete(firestore.doc(`${USERS}/${uid}`));

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
  const callerDoc = await firestore.doc(`${USERS}/${request.auth.uid}`).get();
  const callerData = callerDoc.data();
  const callerRole = callerData?.role;
  if (!["admin", "stake_president", "bishop"].includes(callerRole)) {
    throw new HttpsError("permission-denied", "Insufficient permissions");
  }

  const requestDoc = await firestore.doc(`${STAKE_WARD_CHANGE_REQUESTS}/${requestId}`).get();
  if (!requestDoc.exists) {
    throw new HttpsError("not-found", "Request not found");
  }

  const requestData = requestDoc.data()!;
  if (requestData.status !== "pending") {
    throw new HttpsError("failed-precondition", "Request already processed");
  }

  // Non-admin callers must match the requested stake/ward
  if (callerRole !== "admin") {
    const callerStake = callerData?.stake || "";
    const callerWard = callerData?.ward || "";
    if (callerRole === "stake_president" && callerStake !== requestData.requestedStake) {
      throw new HttpsError("permission-denied", "Can only approve requests for your stake");
    }
    if (callerRole === "bishop" && (callerStake !== requestData.requestedStake || callerWard !== requestData.requestedWard)) {
      throw new HttpsError("permission-denied", "Can only approve requests for your ward");
    }
  }

  if (!approved) {
    await requestDoc.ref.update({
      status: "rejected",
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: request.auth.uid,
      approvedByName: callerData?.name || "",
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
  batch.update(firestore.doc(`${USERS}/${requestData.userId}`), {
    stake: requestData.requestedStake,
    ward: requestData.requestedWard,
    pendingStake: admin.firestore.FieldValue.delete(),
    pendingWard: admin.firestore.FieldValue.delete(),
  });

  // Cascade update applications
  const apps = await firestore
    .collection(APPLICATIONS)
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
    .collection(RECOMMENDATIONS)
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

/**
 * Cascade-delete a conference and all related data.
 * Handles batches of 500 (Firestore limit).
 */
async function cascadeDeleteConference(conferenceId: string): Promise<void> {
  // 1. Collect application IDs for this conference
  const appSnap = await firestore
    .collection(APPLICATIONS)
    .where("conferenceId", "==", conferenceId)
    .get();
  const applicationIds = appSnap.docs.map((d) => d.id);

  // 2. Collect recommendation IDs for this conference
  const recSnap = await firestore
    .collection(RECOMMENDATIONS)
    .where("conferenceId", "==", conferenceId)
    .get();
  const recommendationIds = recSnap.docs.map((d) => d.id);

  // Collect all refs to delete
  const allRefs: admin.firestore.DocumentReference[] = [];

  // Application memos (query in chunks of 30 for 'in' operator limit)
  for (let i = 0; i < applicationIds.length; i += 30) {
    const chunk = applicationIds.slice(i, i + 30);
    const memoSnap = await firestore
      .collection(MEMOS)
      .where("applicationId", "in", chunk)
      .get();
    memoSnap.docs.forEach((d) => allRefs.push(d.ref));
  }

  // Recommendation comments (query in chunks of 30)
  for (let i = 0; i < recommendationIds.length; i += 30) {
    const chunk = recommendationIds.slice(i, i + 30);
    const commentSnap = await firestore
      .collection(RECOMMENDATION_COMMENTS)
      .where("recommendationId", "in", chunk)
      .get();
    commentSnap.docs.forEach((d) => allRefs.push(d.ref));
  }

  // Applications
  appSnap.docs.forEach((d) => allRefs.push(d.ref));

  // Recommendations
  recSnap.docs.forEach((d) => allRefs.push(d.ref));

  // Positions
  const posSnap = await firestore
    .collection(POSITIONS)
    .where("conferenceId", "==", conferenceId)
    .get();
  posSnap.docs.forEach((d) => allRefs.push(d.ref));

  // Conference document itself
  allRefs.push(firestore.doc(`${CONFERENCES}/${conferenceId}`));

  // Commit in batches of 500
  for (let i = 0; i < allRefs.length; i += 500) {
    const batch = firestore.batch();
    allRefs.slice(i, i + 500).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

/**
 * Permanently delete a deactivated conference and all related data.
 * Only admins can call this function.
 */
export const permanentlyDeleteConference = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated");
  }

  const callerDoc = await firestore.doc(`${USERS}/${request.auth.uid}`).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can permanently delete conferences");
  }

  const { conferenceId } = request.data;
  if (!conferenceId || typeof conferenceId !== "string") {
    throw new HttpsError("invalid-argument", "conferenceId is required");
  }

  const confDoc = await firestore.doc(`${CONFERENCES}/${conferenceId}`).get();
  if (!confDoc.exists) {
    throw new HttpsError("not-found", "Conference not found");
  }

  await cascadeDeleteConference(conferenceId);
  return { success: true };
});

/**
 * Scheduled function that runs daily at 00:00 UTC.
 * Permanently deletes conferences that have been deactivated for more than 30 days.
 */
export const cleanupDeactivatedConferences = onSchedule("every day 00:00", async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const snap = await firestore
    .collection(CONFERENCES)
    .where("isActive", "==", false)
    .get();

  for (const doc of snap.docs) {
    const data = doc.data();
    const deactivatedAt = data.deactivatedAt?.toDate?.() ?? null;
    if (deactivatedAt && deactivatedAt < thirtyDaysAgo) {
      console.log(`Auto-deleting conference ${doc.id} (deactivated at ${deactivatedAt})`);
      await cascadeDeleteConference(doc.id);
    }
  }
});
