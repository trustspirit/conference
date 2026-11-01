"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiChat = exports.onProjectMembersWrite = exports.getDashboardStats = exports.weeklyApproverDigest = exports.onRequestStatusChange = exports.onUserCreatedNotifyAdmins = exports.onRequestCreated = exports.splitCorporateCardRequest = exports.calculateDistance = exports.deleteUserAccount = exports.cleanupDeletedProjects = exports.onProjectDeletionChange = exports.downloadFileV2 = exports.deleteStorageFiles = exports.uploadRouteMap = exports.uploadVendorBankBook = exports.uploadBankBookV2 = exports.uploadReceiptsV2 = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const firestore_2 = require("firebase-admin/firestore");
const nodemailer = __importStar(require("nodemailer"));
const node_crypto_1 = require("node:crypto");
const splitCorporateCard_1 = require("./lib/splitCorporateCard");
const pendingSignupRecipients_1 = require("./lib/pendingSignupRecipients");
const projectSummary_1 = require("./lib/projectSummary");
admin.initializeApp();
// --- Email notification secrets & config ---
const gmailUser = (0, params_1.defineSecret)('GMAIL_USER');
const gmailAppPassword = (0, params_1.defineSecret)('GMAIL_APP_PASSWORD');
const kakaoMobilityKey = (0, params_1.defineSecret)('KAKAO_MOBILITY_API_KEY');
const openaiApiKey = (0, params_1.defineSecret)('OPENAI_API_KEY');
const anthropicApiKey = (0, params_1.defineSecret)('ANTHROPIC_API_KEY');
function createTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser.value(),
            pass: gmailAppPassword.value()
        }
    });
}
const APP_URL = process.env.APP_URL;
const STORAGE_BUCKET = process.env.STORAGE_BUCKET;
const bucket = admin.storage().bucket(STORAGE_BUCKET);
const MAX_UPLOAD_BYTES = 750 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf']);
// Verify file content matches its declared MIME using magic bytes — prevents a
// client from uploading an arbitrary blob (e.g. an executable) labeled as image/png.
function detectMimeFromMagic(buffer) {
    if (buffer.length >= 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
        buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) {
        return 'image/png';
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }
    if (buffer.length >= 4 && buffer.subarray(0, 4).toString() === '%PDF') {
        return 'application/pdf';
    }
    return null;
}
// Strip directory separators / NUL / control chars to keep storagePath predictable.
function sanitizeFilename(name) {
    // Replace control chars and path separators, and collapse runs of dots so
    // saved-webpage names (e.g. Coupang "...card-receipt_view..pdf") never put a
    // ".." into the storage path. Keeps download path-traversal validation happy.
    return (name
        .replace(/[\x00-\x1f/\\]/g, '_')
        .replace(/\.{2,}/g, '.')
        .slice(0, 200) || 'file');
}
async function uploadFileToStorage(file, storagePath) {
    if (!file?.data || typeof file.data !== 'string' || !file.data.startsWith('data:')) {
        throw new https_1.HttpsError('invalid-argument', 'File data must be a base64 data URI');
    }
    const commaIdx = file.data.indexOf(',');
    if (commaIdx < 0) {
        throw new https_1.HttpsError('invalid-argument', 'Malformed data URI');
    }
    const header = file.data.slice(0, commaIdx); // e.g. "data:image/png;base64"
    const declaredMime = header.split(';')[0].split(':')[1];
    if (!ALLOWED_MIME_TYPES.has(declaredMime)) {
        throw new https_1.HttpsError('invalid-argument', `Disallowed file type: ${declaredMime}`);
    }
    const base64Data = file.data.slice(commaIdx + 1);
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Empty file');
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
        throw new https_1.HttpsError('invalid-argument', `File exceeds ${Math.floor(MAX_UPLOAD_BYTES / 1024)}KB limit`);
    }
    const actualMime = detectMimeFromMagic(buffer);
    if (actualMime !== declaredMime) {
        throw new https_1.HttpsError('invalid-argument', 'File contents do not match declared type');
    }
    const downloadToken = (0, node_crypto_1.randomUUID)();
    const fileRef = bucket.file(storagePath);
    await fileRef.save(buffer, {
        metadata: {
            contentType: actualMime,
            metadata: {
                firebaseStorageDownloadTokens: downloadToken
            }
        }
    });
    const encodedPath = encodeURIComponent(storagePath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;
    return {
        fileName: file.name,
        storagePath,
        url
    };
}
// 영수증 업로드
exports.uploadReceiptsV2 = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { files, committee, projectId } = request.data;
    if (!files || files.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'No files provided');
    }
    const results = [];
    for (const file of files) {
        const safeName = sanitizeFilename(file.name);
        const storagePath = `receipts/${projectId || 'default'}/${committee}/${Date.now()}_${safeName}`;
        results.push(await uploadFileToStorage(file, storagePath));
    }
    return results;
});
// 통장사본 업로드
exports.uploadBankBookV2 = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { file } = request.data;
    if (!file) {
        throw new https_1.HttpsError('invalid-argument', 'No file provided');
    }
    // Delete old bank book file if exists
    const userDoc = await admin.firestore().doc(`users/${request.auth.uid}`).get();
    if (userDoc.exists) {
        const oldPath = userDoc.data()?.bankBookPath;
        if (oldPath) {
            try {
                await bucket.file(oldPath).delete();
            }
            catch {
                // Ignore if file already deleted
            }
        }
    }
    const storagePath = `bankbook/${request.auth.uid}/${Date.now()}_${sanitizeFilename(file.name)}`;
    return await uploadFileToStorage(file, storagePath);
});
// 업체 통장사본 업로드
exports.uploadVendorBankBook = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { file } = request.data;
    if (!file) {
        throw new https_1.HttpsError('invalid-argument', 'No file provided');
    }
    // No old-file deletion — vendor bank books are per-request, not per-user
    const storagePath = `vendor-bankbook/${request.auth.uid}/${Date.now()}_${sanitizeFilename(file.name)}`;
    return await uploadFileToStorage(file, storagePath);
});
// 경로맵 업로드
exports.uploadRouteMap = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { file, committee, projectId } = request.data;
    if (!file) {
        throw new https_1.HttpsError('invalid-argument', 'No file provided');
    }
    const storagePath = `routemaps/${projectId || 'default'}/${committee}/${Date.now()}_route.png`;
    return await uploadFileToStorage(file, storagePath);
});
// Delete storage files by paths (used to clean up old route maps on resubmit)
exports.deleteStorageFiles = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { paths } = request.data;
    if (!paths || paths.length === 0)
        return { deleted: 0 };
    // Only allow deleting routemap files for safety
    const safePaths = paths.filter((p) => p.startsWith('routemaps/'));
    await Promise.all(safePaths.map((p) => bucket.file(p).delete().catch(() => { })));
    return { deleted: safePaths.length };
});
const STAFF_ROLES = new Set([
    'admin',
    'super_admin',
    'executive',
    'session_director',
    'logistic_admin',
    'finance_prep',
    'finance_ops',
    'approver_ops',
    'approver_prep'
]);
/**
 * True if the user has any "staff" role anywhere in the system —
 * i.e., system admin/super_admin OR has a staff-level ProjectRole in any project.
 * Used for the bankbook bypass: finance/approver staff need to see other users'
 * bank info for verification.
 */
async function hasStaffRoleAnywhere(uid) {
    const db = admin.firestore();
    const userDoc = await db.doc(`users/${uid}`).get();
    const data = userDoc.data();
    if (!data)
        return false;
    // System-level staff
    if (data.systemRole === 'super_admin' || data.systemRole === 'admin')
        return true;
    // Project-level: scan all projects (small N in this app — typically <10)
    const projects = await db.collection('projects').get();
    for (const p of projects.docs) {
        const role = p.data()?.memberRoles?.[uid];
        if (role && STAFF_ROLES.has(role))
            return true;
    }
    return false;
}
async function uidsWithProjectRoles(projectId, roles) {
    if (!projectId)
        return [];
    const db = admin.firestore();
    const projDoc = await db.doc(`projects/${projectId}`).get();
    const data = projDoc.data() ?? {};
    const result = [];
    for (const [uid, r] of Object.entries((data.memberRoles ?? {}))) {
        if (roles.includes(r))
            result.push({ uid, role: r });
    }
    return result;
}
/** 닫힌 프로젝트(closedAt 설정됨)는 알림 및 정산 관련 처리를 모두 중단한다. */
function isProjectClosedData(data) {
    return data?.closedAt != null;
}
async function isProjectClosed(projectId) {
    if (!projectId)
        return false;
    const snap = await admin.firestore().doc(`projects/${projectId}`).get();
    return isProjectClosedData(snap.data());
}
/**
 * 호출자의 이 프로젝트 내 유효 역할. super_admin 은 모든 프로젝트에서 admin 으로
 * 승격된다 — 클라이언트의 useProjectRole 과 같은 규칙이다.
 */
async function callerProjectRole(projectId, uid) {
    const db = admin.firestore();
    const userDoc = await db.doc(`users/${uid}`).get();
    if (userDoc.data()?.systemRole === 'super_admin')
        return 'admin';
    if (!projectId)
        return null;
    const projDoc = await db.doc(`projects/${projectId}`).get();
    const roles = (projDoc.data()?.memberRoles ?? {});
    return roles[uid] ?? null;
}
function getSystemRole(d) {
    if (!d)
        return null;
    return d.systemRole ?? null;
}
async function assertCanReadStoragePath(uid, storagePath) {
    // Reject path traversal and absolute paths up front. We check for a standalone
    // ".." path *segment* rather than a bare ".." substring: filenames are sanitized
    // at upload (slashes/backslashes replaced), so ".." inside a filename
    // (e.g. "card-receipt_view..pdf") can never escape its directory and is legitimate.
    const segments = storagePath.split('/');
    if (storagePath.startsWith('/') || segments.some((s) => s === '..')) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid storage path');
    }
    const isStaff = await hasStaffRoleAnywhere(uid);
    // bankbook/{ownerUid}/... and vendor-bankbook/{ownerUid}/...
    const bankMatch = storagePath.match(/^(?:vendor-)?bankbook\/([^/]+)\//);
    if (bankMatch) {
        const ownerUid = bankMatch[1];
        if (ownerUid !== uid && !isStaff) {
            throw new https_1.HttpsError('permission-denied', 'Not authorized to read this file');
        }
        return;
    }
    // receipts/{projectId}/... and routemaps/{projectId}/... — staff or project member
    const projectMatch = storagePath.match(/^(?:receipts|routemaps)\/([^/]+)\//);
    if (projectMatch) {
        if (isStaff)
            return;
        const projectId = projectMatch[1];
        const proj = await admin.firestore().doc(`projects/${projectId}`).get();
        const memberRoles = proj.data()?.memberRoles;
        if (!memberRoles || memberRoles[uid] === undefined) {
            throw new https_1.HttpsError('permission-denied', 'Not authorized to read this file');
        }
        return;
    }
    // Unknown path prefix — deny by default.
    throw new https_1.HttpsError('permission-denied', 'Not authorized to read this file');
}
// 파일 다운로드 프록시 (CORS 우회)
exports.downloadFileV2 = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { storagePath } = request.data;
    if (!storagePath || typeof storagePath !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'No storage path provided');
    }
    await assertCanReadStoragePath(request.auth.uid, storagePath);
    const fileRef = bucket.file(storagePath);
    const [exists] = await fileRef.exists();
    if (!exists) {
        throw new https_1.HttpsError('not-found', 'File not found');
    }
    const [buffer] = await fileRef.download();
    const [metadata] = await fileRef.getMetadata();
    return {
        data: buffer.toString('base64'),
        contentType: metadata.contentType || 'application/octet-stream',
        fileName: storagePath.split('/').pop() || 'file'
    };
});
// 삭제 즉시 리포트를 만들고, 복원되면 리포트를 지운다 (복원된 대회는 '지난 대회'가 아니므로).
exports.onProjectDeletionChange = (0, firestore_1.onDocumentUpdated)('projects/{projectId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const projectId = event.params.projectId;
    const db = admin.firestore();
    const wasDeleted = before.isActive === false && !!before.deletedAt;
    const isDeleted = after.isActive === false && !!after.deletedAt;
    if (!wasDeleted && isDeleted) {
        await (0, projectSummary_1.archiveProjectSummary)(db, projectId, after);
    }
    else if (wasDeleted && !isDeleted) {
        await db.doc(`projectSummaries/${projectId}`).delete();
    }
});
// 삭제 후 이 기간(일)이 지나면 상세 데이터를 영구 삭제한다. 프론트의 PROJECT_DELETION_GRACE_DAYS와 같아야 한다.
const PROJECT_PURGE_GRACE_DAYS = 10;
// 삭제 후 유예 기간이 지난 프로젝트의 상세 데이터 자동 정리 (매일 실행). 리포트는 삭제 시점에 이미 보존됨.
exports.cleanupDeletedProjects = (0, scheduler_1.onSchedule)('every 24 hours', async () => {
    const db = admin.firestore();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PROJECT_PURGE_GRACE_DAYS);
    const snapshot = await db
        .collection('projects')
        .where('isActive', '==', false)
        .where('deletedAt', '<=', cutoff)
        .get();
    for (const projectDoc of snapshot.docs) {
        const projectId = projectDoc.id;
        console.log(`Permanently deleting project: ${projectId}`);
        // The report is normally created at deletion time (onProjectDeletionChange). Only fall back
        // to archiving here (e.g. projects deleted before that trigger existed). If that fails we
        // skip the project so it is retried instead of losing the report.
        try {
            const existing = await db.doc(`projectSummaries/${projectId}`).get();
            if (!existing.exists)
                await (0, projectSummary_1.archiveProjectSummary)(db, projectId, projectDoc.data());
        }
        catch (err) {
            console.error(`Failed to archive summary for ${projectId}; skipping deletion`, err);
            continue;
        }
        // Collect all storage paths to delete
        const storagePaths = [];
        // Delete requests + collect receipt paths
        const requests = await db.collection('requests').where('projectId', '==', projectId).get();
        for (const reqDoc of requests.docs) {
            for (const receipt of reqDoc.data().receipts || []) {
                if (receipt.storagePath)
                    storagePaths.push(receipt.storagePath);
            }
        }
        for (let i = 0; i < requests.docs.length; i += 500) {
            const batch = db.batch();
            requests.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
            await batch.commit();
        }
        // Delete settlements + collect receipt paths
        const settlements = await db.collection('settlements').where('projectId', '==', projectId).get();
        for (const setDoc of settlements.docs) {
            for (const receipt of setDoc.data().receipts || []) {
                if (receipt.storagePath)
                    storagePaths.push(receipt.storagePath);
            }
        }
        for (let i = 0; i < settlements.docs.length; i += 500) {
            const batch = db.batch();
            settlements.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
            await batch.commit();
        }
        // Delete all collected storage files
        await Promise.all(storagePaths.map((p) => bucket
            .file(p)
            .delete()
            .catch(() => {
            /* ignore missing */
        })));
        // Delete entire receipts folder for this project (catch any orphaned files)
        const [orphanedFiles] = await bucket.getFiles({ prefix: `receipts/${projectId}/` });
        await Promise.all(orphanedFiles.map((f) => f.delete().catch(() => {
            /* ignore */
        })));
        // Delete orphaned route map files
        const [orphanedRouteMaps] = await bucket.getFiles({ prefix: `routemaps/${projectId}/` });
        await Promise.all(orphanedRouteMaps.map((f) => f.delete().catch(() => {
            /* ignore */
        })));
        // Delete the project document together with its subcollections (opsBudgetInclusions)
        await db.recursiveDelete(projectDoc.ref);
        console.log(`Deleted project ${projectId}: ${requests.size} requests, ${settlements.size} settlements, ${storagePaths.length + orphanedFiles.length + orphanedRouteMaps.length} files`);
    }
});
// 사용자 삭제 (Firestore 문서 + Firebase Auth 계정)
exports.deleteUserAccount = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    // 호출자가 admin 또는 super_admin인지 확인
    const callerDoc = await admin.firestore().doc(`users/${request.auth.uid}`).get();
    const callerRole = getSystemRole(callerDoc.data());
    if (callerRole !== 'super_admin') {
        throw new https_1.HttpsError('permission-denied', 'Only super_admin can delete users');
    }
    const { uid } = request.data;
    if (!uid) {
        throw new https_1.HttpsError('invalid-argument', 'User UID is required');
    }
    // super_admin은 삭제 불가
    const targetDoc = await admin.firestore().doc(`users/${uid}`).get();
    if (targetDoc.exists && getSystemRole(targetDoc.data()) === 'super_admin') {
        throw new https_1.HttpsError('permission-denied', 'Cannot delete super_admin');
    }
    // 본인 삭제 불가
    if (uid === request.auth.uid) {
        throw new https_1.HttpsError('permission-denied', 'Cannot delete yourself');
    }
    // Firestore 문서 삭제
    await admin.firestore().doc(`users/${uid}`).delete();
    // Firebase Auth 계정 삭제
    try {
        await admin.auth().deleteUser(uid);
    }
    catch (error) {
        console.warn(`Auth account deletion failed for ${uid}:`, error);
    }
    // 프로젝트 memberRoles에서 제거
    const projectsSnapshot = await admin.firestore().collection('projects').get();
    for (const projectDoc of projectsSnapshot.docs) {
        const memberRoles = (projectDoc.data()?.memberRoles ?? {});
        if (memberRoles[uid] !== undefined) {
            await projectDoc.ref.update({ [`memberRoles.${uid}`]: firestore_2.FieldValue.delete() });
        }
    }
    console.log(`User ${uid} deleted by ${request.auth.uid}`);
    return { success: true };
});
/**
 * Douglas-Peucker line simplification for [lng, lat, lng, lat, ...] flat arrays.
 */
function simplifyPath(coords, tolerance = 0.0001) {
    const points = [];
    for (let i = 0; i < coords.length; i += 2) {
        points.push([coords[i], coords[i + 1]]);
    }
    if (points.length <= 2)
        return coords;
    function perpendicularDistance(pt, lineStart, lineEnd) {
        const dx = lineEnd[0] - lineStart[0];
        const dy = lineEnd[1] - lineStart[1];
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag === 0)
            return Math.sqrt((pt[0] - lineStart[0]) ** 2 + (pt[1] - lineStart[1]) ** 2);
        const u = ((pt[0] - lineStart[0]) * dx + (pt[1] - lineStart[1]) * dy) / (mag * mag);
        const closestX = lineStart[0] + u * dx;
        const closestY = lineStart[1] + u * dy;
        return Math.sqrt((pt[0] - closestX) ** 2 + (pt[1] - closestY) ** 2);
    }
    function simplify(pts, tol) {
        if (pts.length <= 2)
            return pts;
        let maxDist = 0;
        let maxIdx = 0;
        for (let i = 1; i < pts.length - 1; i++) {
            const d = perpendicularDistance(pts[i], pts[0], pts[pts.length - 1]);
            if (d > maxDist) {
                maxDist = d;
                maxIdx = i;
            }
        }
        if (maxDist > tol) {
            const left = simplify(pts.slice(0, maxIdx + 1), tol);
            const right = simplify(pts.slice(maxIdx), tol);
            return [...left.slice(0, -1), ...right];
        }
        return [pts[0], pts[pts.length - 1]];
    }
    const simplified = simplify(points, tolerance);
    const result = [];
    for (const [x, y] of simplified) {
        result.push(x, y);
    }
    return result;
}
// --- Kakao Mobility distance calculation ---
exports.calculateDistance = (0, https_1.onCall)({ secrets: [kakaoMobilityKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { origin, destination } = request.data;
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
        throw new https_1.HttpsError('invalid-argument', 'Origin and destination coordinates are required');
    }
    // Kakao Mobility uses longitude,latitude order
    // priority=DISTANCE: 환급 지침 기준 "거리우선" 경로 사용
    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&priority=DISTANCE`;
    const response = await fetch(url, {
        headers: {
            Authorization: `KakaoAK ${kakaoMobilityKey.value()}`
        }
    });
    if (!response.ok) {
        console.error('Kakao Mobility API error:', response.status, await response.text());
        throw new https_1.HttpsError('internal', 'Failed to calculate distance');
    }
    const data = (await response.json());
    const routes = data.routes;
    if (!routes || routes.length === 0 || routes[0].result_code !== 0) {
        throw new https_1.HttpsError('not-found', 'No route found');
    }
    const distanceMeters = routes[0].summary.distance;
    // Extract route path coordinates [lng, lat, lng, lat, ...]
    const routePath = [];
    for (const section of routes[0].sections) {
        for (const road of section.roads) {
            routePath.push(...road.vertexes);
        }
    }
    return { distanceMeters, routePath: simplifyPath(routePath) };
});
/**
 * 제출된 신청서의 일부 항목을 법인카드 신청서로 분리한다.
 *
 * 클라이언트에서 직접 못 하는 이유: firestore.rules 의 create 는
 * `requestedBy.uid == request.auth.uid` 를 요구하므로 admin 이 원 신청자 이름으로
 * 문서를 만들 수 없고, update 는 모든 전이가 affectedKeys().hasOnly() 로 잠겨 있어
 * `items` 를 어떤 경로로도 수정할 수 없다.
 *
 * 금액은 클라이언트에서 받지 않는다. 서버가 원본 문서에서 직접 재계산한다.
 */
exports.splitCorporateCardRequest = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    const uid = request.auth.uid;
    const { requestId, corporateItemIndexes, corporateReceiptPaths } = request.data;
    if (!requestId || typeof requestId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'requestId is required');
    }
    if (!Array.isArray(corporateItemIndexes) || !Array.isArray(corporateReceiptPaths)) {
        throw new https_1.HttpsError('invalid-argument', 'corporateItemIndexes and corporateReceiptPaths must be arrays');
    }
    const db = admin.firestore();
    const reqRef = db.doc(`requests/${requestId}`);
    // 새 법인카드 문서 ref 는 트랜잭션 밖에서 만든다 — 경합 시 Firestore 가 콜백을
    // 재시도할 수 있는데, 안에서 만들면 재시도마다 새 id 가 발급되어 버린다.
    const newRef = db.collection('requests').doc();
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(reqRef);
        if (!snap.exists)
            throw new https_1.HttpsError('not-found', 'Request not found');
        const data = snap.data();
        // 권한 확인을 상태/유형 확인보다 먼저 한다 — 그렇지 않으면 프로젝트에 아무 역할도
        // 없는 사용자도 임의의 requestId 로 상태와 법인카드 여부를 알아낼 수 있다.
        // 역할 조회는 일반 읽기로 남긴다 — 멤버십은 스냅샷 격리가 필요 없고, 트랜잭션에
        // 넣으면 경합 범위만 불필요하게 넓어진다.
        const role = await callerProjectRole(data.projectId, uid);
        if (!(0, splitCorporateCard_1.canSplitRequest)(role, data.committee)) {
            throw new https_1.HttpsError('permission-denied', 'SPLIT_FORBIDDEN');
        }
        if (data.status !== 'pending' && data.status !== 'reviewed') {
            throw new https_1.HttpsError('failed-precondition', 'SPLIT_STATUS_NOT_ALLOWED');
        }
        if (data.isCorporateCard === true) {
            throw new https_1.HttpsError('failed-precondition', 'SPLIT_ALREADY_CORPORATE_CARD');
        }
        if (data.isVendorRequest === true) {
            throw new https_1.HttpsError('failed-precondition', 'SPLIT_VENDOR_NOT_ALLOWED');
        }
        // 운영예산 편입 항목은 {requestId, itemIndex} 로 신청서를 참조한다. 분리는 items
        // 인덱스를 밀어버리므로 편입이 하나라도 있으면 거부한다.
        const inclusionsQuery = db
            .collection(`projects/${data.projectId}/opsBudgetInclusions`)
            .where('requestId', '==', requestId)
            .limit(1);
        const inclusions = await tx.get(inclusionsQuery);
        if (!inclusions.empty) {
            throw new https_1.HttpsError('failed-precondition', 'SPLIT_OPS_BUDGET_INCLUDED');
        }
        // IIFE 로 감싼다 — try 범위를 splitCorporateCard 호출 하나로 좁게 유지하고,
        // 그 안에서 던져진 검증 에러를 던진 지점에서 바로 HttpsError 로 변환하기 위함이다.
        const split = (() => {
            try {
                return (0, splitCorporateCard_1.splitCorporateCard)({
                    items: data.items ?? [],
                    receipts: data.receipts ?? [],
                    receiptDisplaySizes: data.receiptDisplaySizes,
                    corporateItemIndexes,
                    corporateReceiptPaths
                });
            }
            catch (e) {
                if (e instanceof splitCorporateCard_1.SplitValidationError)
                    throw new https_1.HttpsError('invalid-argument', e.reason);
                throw e;
            }
        })();
        // 원본: 남은 항목만 남기고 결재 상태를 pending 으로 되돌린다. 금액이 바뀌면
        // 승인 권한 기준(directorApprovalThreshold)도 바뀌므로 재검토를 강제한다.
        const originalUpdate = {
            items: split.original.items,
            receipts: split.original.receipts,
            totalAmount: split.original.totalAmount,
            totalAmountUsd: split.original.totalAmountUsd !== undefined
                ? split.original.totalAmountUsd
                : firestore_2.FieldValue.delete(),
            status: 'pending',
            reviewedBy: null,
            reviewedAt: null,
            approvedBy: null,
            approvedAt: null,
            approvalSignature: null,
            rejectionReason: null
        };
        if (split.original.receiptDisplaySizes !== undefined) {
            originalUpdate.receiptDisplaySizes = split.original.receiptDisplaySizes;
        }
        tx.update(reqRef, originalUpdate);
        // 신규: 신원 필드만 복사한다. isVendorRequest/vendorBankBook* 는 복사하지 않는다 —
        // 신청 유형은 일반/거래처/법인카드 중 하나만 고르는 배타적 선택이고, 법인카드로
        // 결제된 부분은 업체에 송금되지 않는다.
        const corporateDoc = {
            projectId: data.projectId,
            requestedBy: data.requestedBy,
            requestedBySignature: data.requestedBySignature ?? null,
            committee: data.committee,
            session: data.session,
            date: data.date,
            payee: data.payee,
            phone: data.phone,
            bankName: data.bankName ?? '',
            bankAccount: data.bankAccount ?? '',
            comments: data.comments ?? '',
            items: split.corporate.items,
            receipts: split.corporate.receipts,
            totalAmount: split.corporate.totalAmount,
            isCorporateCard: true,
            status: 'pending',
            reviewedBy: null,
            reviewedAt: null,
            approvedBy: null,
            approvedAt: null,
            approvalSignature: null,
            rejectionReason: null,
            settlementId: null,
            originalRequestId: null,
            splitFromRequestId: requestId,
            createdAt: firestore_2.FieldValue.serverTimestamp()
        };
        if (split.corporate.totalAmountUsd !== undefined) {
            corporateDoc.totalAmountUsd = split.corporate.totalAmountUsd;
        }
        if (split.corporate.receiptDisplaySizes !== undefined) {
            corporateDoc.receiptDisplaySizes = split.corporate.receiptDisplaySizes;
        }
        tx.set(newRef, corporateDoc);
    });
    return { originalId: requestId, corporateCardId: newRef.id };
});
// --- Email Notification Functions ---
const COMMITTEE_LABELS = {
    operations: '운영위원회',
    preparation: '준비위원회'
};
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function formatCurrency(amount, amountUsd) {
    const parts = [];
    if (amount > 0)
        parts.push(amount.toLocaleString('ko-KR') + '원');
    if (amountUsd && amountUsd > 0) {
        parts.push('$' +
            amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
    if (parts.length === 0)
        return '0원';
    return parts.join(' + ');
}
function formatDate(date) {
    if (!date)
        return '-';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
// 신청서 생성 시 → 해당 위원회 재정 담당자에게 검토 요청 알림
exports.onRequestCreated = (0, firestore_1.onDocumentCreated)({
    document: 'requests/{requestId}',
    secrets: [gmailUser, gmailAppPassword]
}, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const committee = data.committee;
    const totalAmount = data.totalAmount;
    const totalAmountUsd = data.totalAmountUsd;
    const requestedBy = data.requestedBy;
    const payee = data.payee;
    const projectId = data.projectId;
    if (await isProjectClosed(projectId)) {
        console.log('Project closed, skipping new request notification:', projectId);
        return;
    }
    // Find finance reviewers for this committee (project-scoped)
    const db = admin.firestore();
    const reviewerRoles = committee === 'operations' ? ['finance_ops', 'finance_prep'] : ['finance_prep'];
    const recipients = await uidsWithProjectRoles(projectId, reviewerRoles);
    if (recipients.length === 0) {
        console.log('No finance reviewers found for committee:', committee);
        return;
    }
    const transporter = createTransporter();
    const committeeLabel = COMMITTEE_LABELS[committee] || committee;
    const recipientDocs = await Promise.all(recipients.map(r => db.doc(`users/${r.uid}`).get()));
    for (const userDoc of recipientDocs) {
        const user = userDoc.data();
        const email = user?.email;
        if (!email)
            continue;
        try {
            await transporter.sendMail({
                from: `지불/환불 시스템 <${gmailUser.value()}>`,
                to: email,
                subject: `[지불/환불] 새 신청서 검토 요청 (${committeeLabel})`,
                html: `
            <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #2563eb; margin-bottom: 16px;">새 신청서가 접수되었습니다</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 8px 0; color: #6b7280;">위원회</td><td style="padding: 8px 0;">${committeeLabel}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">신청자</td><td style="padding: 8px 0;">${escapeHtml(payee)} (${escapeHtml(requestedBy.name)})</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">신청 금액</td><td style="padding: 8px 0; font-weight: 600;">${formatCurrency(totalAmount, totalAmountUsd)}</td></tr>
              </table>
              <p style="margin-top: 20px;"><a href="${APP_URL}/admin/requests" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">신청서 검토하기</a></p>
            </div>
          `
            });
            console.log(`New request notification sent to ${email}`);
        }
        catch (error) {
            console.error(`Failed to send new request notification to ${email}:`, error);
        }
    }
});
// 신규 가입 → default 대회의 admin 에게 승인 대기 알림
exports.onUserCreatedNotifyAdmins = (0, firestore_1.onDocumentCreated)({
    document: 'users/{uid}',
    secrets: [gmailUser, gmailAppPassword]
}, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    // 정상 가입은 항상 assignedProjectCount: 0 으로 생성된다(AuthContext.tsx:110).
    // 필드 자체가 없는 문서(레거시/시드 등)도 안전한 기본값으로 간주해 대기 상태로 처리한다.
    // 이미 0이 아닌 값을 가진 문서만 건너뛴다.
    const assigned = data.assignedProjectCount;
    if (assigned !== 0 && assigned !== undefined && assigned !== null)
        return;
    const db = admin.firestore();
    const settingsSnap = await db.doc('settings/global').get();
    const defaultProjectId = settingsSnap.data()?.defaultProjectId ?? null;
    let memberRoles = null;
    if (defaultProjectId) {
        const projSnap = await db.doc(`projects/${defaultProjectId}`).get();
        memberRoles = projSnap.exists
            ? (projSnap.data()?.memberRoles ?? {})
            : null;
    }
    const superAdminSnap = await db
        .collection('users')
        .where('systemRole', '==', 'super_admin')
        .get();
    const superAdminUids = superAdminSnap.docs.map((d) => d.id);
    const recipientUids = (0, pendingSignupRecipients_1.resolvePendingSignupRecipients)(defaultProjectId, memberRoles, superAdminUids);
    if (recipientUids.length === 0) {
        console.error('No recipient for pending signup notification', {
            newUserUid: event.params.uid,
            defaultProjectId
        });
        return;
    }
    // 신규 가입자 본인이 수신자 목록에 있으면 제외한다(첫 super_admin 시딩 등).
    const targets = recipientUids.filter((uid) => uid !== event.params.uid);
    if (targets.length === 0) {
        console.log('Pending signup notification skipped: new user is the only recipient', {
            newUserUid: event.params.uid
        });
        return;
    }
    const transporter = createTransporter();
    // AppUser 에는 createdAt 필드가 없다(AuthContext.tsx:100-111). 문서에서 읽으면
    // 항상 비므로 이벤트 발생 시각을 쓴다.
    const signedUpAt = formatDate(new Date(event.time));
    const name = data.displayName || data.name || '(이름 미입력)';
    const email = data.email || '-';
    const recipientDocs = await Promise.all(targets.map((uid) => db.doc(`users/${uid}`).get()));
    for (const userDoc of recipientDocs) {
        const to = userDoc.data()?.email;
        if (!to)
            continue;
        try {
            await transporter.sendMail({
                from: `지불/환불 시스템 <${gmailUser.value()}>`,
                to,
                subject: '[지불/환불] 새 사용자 가입 승인 대기',
                html: `
            <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #2563eb; margin-bottom: 16px;">새 사용자가 가입해 배정을 기다리고 있습니다</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 8px 0; color: #6b7280;">이름</td><td style="padding: 8px 0;">${escapeHtml(name)}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">이메일</td><td style="padding: 8px 0;">${escapeHtml(email)}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">가입 시각</td><td style="padding: 8px 0;">${signedUpAt}</td></tr>
              </table>
              <p style="color: #6b7280; font-size: 13px;">설정 화면의 <strong>멤버 관리</strong> 탭에서 이 사용자를 프로젝트에 추가할 수 있습니다.</p>
              <p style="margin-top: 20px;"><a href="${APP_URL}/settings" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">멤버 관리로 이동</a></p>
            </div>
          `
            });
            console.log(`Pending signup notification sent to ${to}`);
        }
        catch (error) {
            console.error(`Failed to send pending signup notification to ${to}:`, error);
        }
    }
});
function buildStatusChangeEmail(data, newStatus, requestId) {
    const totalAmount = data.totalAmount;
    const totalAmountUsd = data.totalAmountUsd;
    const approvedBy = data.approvedBy;
    const rejectionReason = data.rejectionReason;
    const approvedAt = data.approvedAt;
    if (newStatus === 'approved') {
        return {
            subject: '[지불/환불] 신청서가 승인되었습니다',
            html: `
        <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #16a34a; margin-bottom: 16px;">신청서가 승인되었습니다</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px 0; color: #6b7280;">신청 금액</td><td style="padding: 8px 0; font-weight: 600;">${formatCurrency(totalAmount, totalAmountUsd)}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">승인자</td><td style="padding: 8px 0;">${approvedBy ? escapeHtml(approvedBy.name) : '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">승인 일시</td><td style="padding: 8px 0;">${formatDate(approvedAt)}</td></tr>
          </table>
          <p style="margin-top: 20px;"><a href="${APP_URL}/request/${requestId || ''}" style="display: inline-block; padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">상세 내역 확인하기</a></p>
        </div>
      `
        };
    }
    if (newStatus === 'rejected') {
        return {
            subject: '[지불/환불] 신청서가 반려되었습니다',
            html: `
        <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #dc2626; margin-bottom: 16px;">신청서가 반려되었습니다</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px 0; color: #6b7280;">신청 금액</td><td style="padding: 8px 0; font-weight: 600;">${formatCurrency(totalAmount, totalAmountUsd)}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">반려 사유</td><td style="padding: 8px 0; color: #dc2626;">${rejectionReason ? escapeHtml(rejectionReason) : '-'}</td></tr>
          </table>
          <p style="margin-top: 20px;"><a href="${APP_URL}/request/${requestId || ''}" style="display: inline-block; padding: 10px 20px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">상세 내역 확인하기</a></p>
        </div>
      `
        };
    }
    // force_rejected
    return {
        subject: '[지불/환불] 승인된 신청서가 반려되었습니다',
        html: `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #ea580c; margin-bottom: 16px;">승인된 신청서가 반려되었습니다</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr><td style="padding: 8px 0; color: #6b7280;">신청 금액</td><td style="padding: 8px 0; font-weight: 600;">${formatCurrency(totalAmount, totalAmountUsd)}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">반려 사유</td><td style="padding: 8px 0; color: #ea580c;">${rejectionReason ? escapeHtml(rejectionReason) : '-'}</td></tr>
        </table>
        <p style="margin-top: 20px;"><a href="${APP_URL}/request/${requestId || ''}" style="display: inline-block; padding: 10px 20px; background-color: #ea580c; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">상세 내역 확인하기</a></p>
      </div>
    `
    };
}
// 신청서 상태 변경 시 이메일 알림
exports.onRequestStatusChange = (0, firestore_1.onDocumentUpdated)({
    document: 'requests/{requestId}',
    secrets: [gmailUser, gmailAppPassword]
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const oldStatus = before.status;
    const newStatus = after.status;
    if (await isProjectClosed(after.projectId)) {
        console.log('Project closed, skipping status change notification:', event.params?.requestId);
        return;
    }
    const db = admin.firestore();
    const transporter = createTransporter();
    // 1) pending → reviewed: 해당 위원회 승인자에게 승인 요청 알림
    if (oldStatus === 'pending' && newStatus === 'reviewed') {
        const committee = after.committee;
        const totalAmount = after.totalAmount;
        const totalAmountUsd = after.totalAmountUsd;
        const payee = after.payee;
        const requestedByUid = after.requestedBy.uid;
        const committeeLabel = COMMITTEE_LABELS[committee] || committee;
        const reqId = event.params?.requestId || '';
        const projectId = after.projectId;
        // 신청자의 역할 확인 (위원장이 신청한 건은 executive만 승인 가능)
        const projectSnap = await db.doc(`projects/${projectId}`).get();
        const requesterRole = projectSnap.data()?.memberRoles?.[requestedByUid] ?? 'user';
        const isDirectorRequest = requesterRole === 'session_director' || requesterRole === 'logistic_admin';
        let approverRoles;
        if (isDirectorRequest) {
            // 위원장이 신청한 건 → executive만 승인 가능
            approverRoles = ['executive'];
        }
        else {
            approverRoles =
                committee === 'operations'
                    ? ['approver_ops', 'session_director', 'executive']
                    : ['approver_prep', 'logistic_admin', 'executive'];
        }
        const recipients = await uidsWithProjectRoles(projectId, approverRoles);
        const recipientDocs = await Promise.all(recipients.map(r => db.doc(`users/${r.uid}`).get()));
        for (const userDoc of recipientDocs) {
            const user = userDoc.data();
            const email = user?.email;
            if (!email)
                continue;
            try {
                await transporter.sendMail({
                    from: `지불/환불 시스템 <${gmailUser.value()}>`,
                    to: email,
                    subject: `[지불/환불] 승인 요청 (${committeeLabel})`,
                    html: `
              <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #16a34a; margin-bottom: 16px;">검토 완료 — 승인이 필요합니다</h2>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tr><td style="padding: 8px 0; color: #6b7280;">위원회</td><td style="padding: 8px 0;">${committeeLabel}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6b7280;">신청자</td><td style="padding: 8px 0;">${escapeHtml(payee)}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6b7280;">신청 금액</td><td style="padding: 8px 0; font-weight: 600;">${formatCurrency(totalAmount, totalAmountUsd)}</td></tr>
                </table>
                <p style="margin-top: 20px;"><a href="${APP_URL}/request/${reqId}" style="display: inline-block; padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">신청서 승인하기</a></p>
              </div>
            `
                });
                console.log(`Approval request notification sent to ${email}`);
            }
            catch (error) {
                console.error(`Failed to send approval notification to ${email}:`, error);
            }
        }
        return;
    }
    if (newStatus === 'cancelled')
        return;
    // 2) 신청자에게 알림: reviewed→approved, pending|reviewed→rejected, approved→force_rejected
    const shouldNotifyRequester = (oldStatus === 'reviewed' && newStatus === 'approved') ||
        ((oldStatus === 'pending' || oldStatus === 'reviewed') && newStatus === 'rejected') ||
        (oldStatus === 'approved' && newStatus === 'force_rejected');
    if (!shouldNotifyRequester)
        return;
    const requestedBy = after.requestedBy;
    if (!requestedBy?.email) {
        console.warn('No requestedBy email found, skipping notification');
        return;
    }
    const requestId = event.params?.requestId || '';
    const { subject, html } = buildStatusChangeEmail(after, newStatus, requestId);
    try {
        await transporter.sendMail({
            from: `지불/환불 시스템 <${gmailUser.value()}>`,
            to: requestedBy.email,
            subject,
            html
        });
        console.log(`Status change email sent to ${requestedBy.email} (${oldStatus}→${newStatus})`);
    }
    catch (error) {
        console.error('Failed to send status change email:', error);
    }
});
function buildWeeklyDigestEmail(userName, projectName, sections) {
    const totalCount = sections.reduce((sum, s) => sum + s.count, 0);
    const sectionHtml = sections
        .filter((s) => s.count > 0)
        .map((s) => `<li>${s.label}: <strong>${s.count}건</strong></li>`)
        .join('');
    return {
        subject: `[지불/환불] ${projectName} 처리 대기 ${totalCount}건`,
        html: `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #2563eb; margin-bottom: 16px;">주간 처리 현황</h2>
        <p style="margin-bottom: 8px; color: #6b7280;">프로젝트: <strong>${escapeHtml(projectName)}</strong></p>
        <p style="margin-bottom: 16px;">${escapeHtml(userName)}님, 처리가 필요한 건이 있습니다.</p>
        <ul style="margin-bottom: 20px; padding-left: 20px;">${sectionHtml}</ul>
        <p style="margin-top: 20px;"><a href="${APP_URL}/admin/requests" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">확인하기</a></p>
      </div>
    `
    };
}
// 매주 일요일 09:00 KST 처리 대기 알림 (프로젝트별로 별도 메일 발송)
exports.weeklyApproverDigest = (0, scheduler_1.onSchedule)({
    // UTC 일요일 00:00 = KST 일요일 09:00 (한국은 DST 없음).
    schedule: 'every sunday 00:00',
    timeZone: 'UTC',
    secrets: [gmailUser, gmailAppPassword]
}, async () => {
    const db = admin.firestore();
    const relevantRoles = [
        'finance_ops',
        'finance_prep',
        'approver_ops',
        'approver_prep',
        'session_director',
        'logistic_admin',
        'executive'
    ];
    // 비활성/삭제/닫힌 프로젝트는 제외
    const projectsSnap = await db.collection('projects').get();
    const activeProjectDocs = projectsSnap.docs.filter((p) => {
        const data = p.data();
        return data.isActive !== false && !data.deletedAt && !isProjectClosedData(data);
    });
    if (activeProjectDocs.length === 0) {
        console.log('No active projects');
        return;
    }
    // super_admin은 개별 신청/상태변경 알림은 받지 않지만, 주간 다이제스트는 받음
    const superSnap = await db.collection('users').where('systemRole', '==', 'super_admin').get();
    const superUids = superSnap.docs.map((d) => d.id);
    const transporter = createTransporter();
    const userCache = new Map();
    const getUser = async (uid) => {
        let cached = userCache.get(uid);
        if (!cached) {
            const data = (await db.doc(`users/${uid}`).get()).data();
            cached = {
                email: data?.email,
                name: (data?.displayName || data?.name || '')
            };
            userCache.set(uid, cached);
        }
        return cached;
    };
    for (const projDoc of activeProjectDocs) {
        const projectId = projDoc.id;
        const projectData = projDoc.data();
        const projectName = projectData.name || projectId;
        // 이 프로젝트 멤버 중 수신자 (uid -> 프로젝트 내 역할, 관련 역할이 없는 super_admin 멤버는 'admin')
        const recipientMap = new Map();
        for (const [uid, role] of Object.entries((projectData.memberRoles ?? {}))) {
            if (relevantRoles.includes(role))
                recipientMap.set(uid, role);
        }
        // super_admin도 해당 프로젝트 멤버인 경우에만 수신 (속하지 않은 프로젝트 알림 제외)
        const memberRoles = (projectData.memberRoles ?? {});
        for (const uid of superUids) {
            if (memberRoles[uid] != null && !recipientMap.has(uid))
                recipientMap.set(uid, 'admin');
        }
        if (recipientMap.size === 0)
            continue;
        const [pendingSnap, reviewedSnap, approvedSnap] = await Promise.all(['pending', 'reviewed', 'approved'].map((status) => db.collection('requests').where('projectId', '==', projectId).where('status', '==', status).get()));
        const byCommittee = (docs, committee) => docs.filter((d) => d.data().committee === committee).length;
        const opsPendingCount = byCommittee(pendingSnap.docs, 'operations');
        const prepPendingCount = byCommittee(pendingSnap.docs, 'preparation');
        const opsReviewedCount = byCommittee(reviewedSnap.docs, 'operations');
        const prepReviewedCount = byCommittee(reviewedSnap.docs, 'preparation');
        const totalReviewedCount = reviewedSnap.size;
        const totalApprovedUnsettledCount = approvedSnap.size;
        for (const [uid, role] of recipientMap) {
            const { email, name } = await getUser(uid);
            if (!email)
                continue;
            const sections = [];
            if (role === 'finance_ops') {
                // 운영위 재정: 운영위 검토 대상
                sections.push({ label: '운영위 검토 대기', count: opsPendingCount });
            }
            else if (role === 'finance_prep') {
                // 준비위 재정(총괄): 준비위 검토 대상 + 승인건 중 미정산
                sections.push({ label: '준비위 검토 대기', count: prepPendingCount });
                sections.push({ label: '승인 미정산', count: totalApprovedUnsettledCount });
            }
            else if (role === 'approver_ops') {
                sections.push({ label: '운영위 승인 대기', count: opsReviewedCount });
            }
            else if (role === 'approver_prep') {
                sections.push({ label: '준비위 승인 대기', count: prepReviewedCount });
            }
            else if (role === 'session_director') {
                // 운영 위원장: 운영위 승인 대기
                sections.push({ label: '운영위 승인 대기', count: opsReviewedCount });
            }
            else if (role === 'logistic_admin') {
                // 준비 위원장: 준비위 승인 대기
                sections.push({ label: '준비위 승인 대기', count: prepReviewedCount });
            }
            else if (role === 'executive' || role === 'admin') {
                // 대회장 / super_admin: 전체 승인 대기 + 미정산
                sections.push({ label: '승인 대기', count: totalReviewedCount });
                sections.push({ label: '승인 미정산', count: totalApprovedUnsettledCount });
            }
            const totalCount = sections.reduce((sum, s) => sum + s.count, 0);
            if (totalCount === 0)
                continue;
            const { subject, html } = buildWeeklyDigestEmail(name, projectName, sections);
            try {
                await transporter.sendMail({
                    from: `지불/환불 시스템 <${gmailUser.value()}>`,
                    to: email,
                    subject,
                    html
                });
                console.log(`Weekly digest sent to ${email} [${projectId}]: ${totalCount} items`);
            }
            catch (error) {
                console.error(`Failed to send weekly digest to ${email} [${projectId}]:`, error);
            }
        }
    }
});
// --- Dashboard Stats ---
exports.getDashboardStats = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { projectId } = request.data;
    if (!projectId || typeof projectId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'projectId is required');
    }
    const db = admin.firestore();
    const callerUid = request.auth.uid;
    const [callerSnap, projSnap] = await Promise.all([
        db.doc(`users/${callerUid}`).get(),
        db.doc(`projects/${projectId}`).get()
    ]);
    const callerSystemRole = getSystemRole(callerSnap.data());
    const isSuperAdmin = callerSystemRole === 'super_admin';
    const isMember = projSnap.data()?.memberRoles?.[callerUid] != null;
    if (!isSuperAdmin && !isMember) {
        throw new https_1.HttpsError('permission-denied', 'Not a member of this project');
    }
    const projectData = projSnap.data() ?? {};
    return (0, projectSummary_1.computeProjectStats)(db, projectId, projectData);
});
var onProjectMembersWrite_1 = require("./onProjectMembersWrite");
Object.defineProperty(exports, "onProjectMembersWrite", { enumerable: true, get: function () { return onProjectMembersWrite_1.onProjectMembersWrite; } });
// --- AI Chatbot ---
const chatHandler_1 = require("./ai/chatHandler");
exports.aiChat = (0, https_1.onCall)({
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: [openaiApiKey, anthropicApiKey]
}, (request) => (0, chatHandler_1.handleChat)(request, {
    openaiApiKey: openaiApiKey.value(),
    anthropicApiKey: anthropicApiKey.value()
}));
//# sourceMappingURL=index.js.map