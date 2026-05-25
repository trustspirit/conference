"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onProjectMembersWrite = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
exports.onProjectMembersWrite = (0, firestore_1.onDocumentWritten)('projects/{projectId}', async (event) => {
    const before = (event.data?.before.data()?.memberRoles ?? {});
    const after = (event.data?.after.data()?.memberRoles ?? {});
    const beforeIds = new Set(Object.keys(before));
    const afterIds = new Set(Object.keys(after));
    const added = [...afterIds].filter((id) => !beforeIds.has(id));
    const removed = [...beforeIds].filter((id) => !afterIds.has(id));
    const db = (0, firestore_2.getFirestore)();
    const ops = [];
    for (const uid of added) {
        ops.push(db.doc(`users/${uid}`).set({ assignedProjectCount: firestore_2.FieldValue.increment(1) }, { merge: true }));
    }
    for (const uid of removed) {
        ops.push(db.doc(`users/${uid}`).set({ assignedProjectCount: firestore_2.FieldValue.increment(-1) }, { merge: true }));
    }
    await Promise.all(ops);
});
//# sourceMappingURL=onProjectMembersWrite.js.map