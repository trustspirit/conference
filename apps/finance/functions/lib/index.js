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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiChat = exports.weeklyApproverDigest = exports.onRequestStatusChange = exports.onRequestCreated = exports.generateRouteMap = exports.calculateDistance = exports.deleteUserAccount = exports.cleanupDeletedProjects = exports.downloadFileV2 = exports.uploadRouteMap = exports.uploadVendorBankBook = exports.uploadBankBookV2 = exports.uploadReceiptsV2 = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const node_crypto_1 = require("node:crypto");
const sharp_1 = __importDefault(require("sharp"));
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
async function uploadFileToStorage(file, storagePath) {
    if (!file.data.includes(',')) {
        throw new Error('File data must be a base64 data URI');
    }
    const base64Data = file.data.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const mimeType = file.data.split(';')[0].split(':')[1];
    const downloadToken = (0, node_crypto_1.randomUUID)();
    const fileRef = bucket.file(storagePath);
    await fileRef.save(buffer, {
        metadata: {
            contentType: mimeType,
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
        const storagePath = `receipts/${projectId || 'default'}/${committee}/${Date.now()}_${file.name}`;
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
    const storagePath = `bankbook/${request.auth.uid}/${Date.now()}_${file.name}`;
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
    const storagePath = `vendor-bankbook/${request.auth.uid}/${Date.now()}_${file.name}`;
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
// 파일 다운로드 프록시 (CORS 우회)
exports.downloadFileV2 = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { storagePath } = request.data;
    if (!storagePath) {
        throw new https_1.HttpsError('invalid-argument', 'No storage path provided');
    }
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
// 30일 지난 삭제된 프로젝트 자동 정리 (매일 실행)
exports.cleanupDeletedProjects = (0, scheduler_1.onSchedule)('every 24 hours', async () => {
    const db = admin.firestore();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const snapshot = await db
        .collection('projects')
        .where('isActive', '==', false)
        .where('deletedAt', '<=', thirtyDaysAgo)
        .get();
    for (const projectDoc of snapshot.docs) {
        const projectId = projectDoc.id;
        console.log(`Permanently deleting project: ${projectId}`);
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
        // Delete the project document
        await projectDoc.ref.delete();
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
    const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;
    if (callerRole !== 'admin' && callerRole !== 'super_admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admin can delete users');
    }
    const { uid } = request.data;
    if (!uid) {
        throw new https_1.HttpsError('invalid-argument', 'User UID is required');
    }
    // super_admin은 삭제 불가
    const targetDoc = await admin.firestore().doc(`users/${uid}`).get();
    if (targetDoc.exists && targetDoc.data()?.role === 'super_admin') {
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
    // 프로젝트 memberUids에서 제거
    const projectsSnap = await admin
        .firestore()
        .collection('projects')
        .where('memberUids', 'array-contains', uid)
        .get();
    for (const projectDoc of projectsSnap.docs) {
        const memberUids = (projectDoc.data().memberUids || []).filter((id) => id !== uid);
        await projectDoc.ref.update({ memberUids });
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
// --- Server-side Route Map Generation (Kakao Static Map + route overlay) ---
const MAP_WIDTH = 600;
const MAP_HEIGHT = 400;
function lat2y(lat) {
    const rad = (lat * Math.PI) / 180;
    return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
}
function lngToTileX(lng, zoom) {
    return ((lng + 180) / 360) * Math.pow(2, zoom);
}
function latToTileY(lat, zoom) {
    return lat2y(lat) * Math.pow(2, zoom);
}
function fitZoom(minLat, maxLat, minLng, maxLng, width, height) {
    const TILE = 256;
    for (let z = 16; z >= 2; z--) {
        const x0 = lngToTileX(minLng, z) * TILE;
        const x1 = lngToTileX(maxLng, z) * TILE;
        const y0 = latToTileY(maxLat, z) * TILE;
        const y1 = latToTileY(minLat, z) * TILE;
        if (x1 - x0 < width * 0.8 && y1 - y0 < height * 0.8)
            return z;
    }
    return 2;
}
exports.generateRouteMap = (0, https_1.onCall)({ secrets: [kakaoMobilityKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { dep, dest, depName, destName, distanceKm, routePath, committee, projectId } = request.data;
    if (!dep || !dest) {
        throw new https_1.HttpsError('invalid-argument', 'dep and dest are required');
    }
    // Collect all points for bounding box
    const lats = [dep.lat, dest.lat];
    const lngs = [dep.lng, dest.lng];
    if (routePath && routePath.length >= 4) {
        for (let i = 0; i < routePath.length; i += 2) {
            lngs.push(routePath[i]);
            lats.push(routePath[i + 1]);
        }
    }
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = maxLat - minLat || 0.01;
    const lngSpan = maxLng - minLng || 0.01;
    const margin = 0.15;
    const adjMinLat = minLat - latSpan * margin;
    const adjMaxLat = maxLat + latSpan * margin;
    const adjMinLng = minLng - lngSpan * margin;
    const adjMaxLng = maxLng + lngSpan * margin;
    const centerLat = (adjMinLat + adjMaxLat) / 2;
    const centerLng = (adjMinLng + adjMaxLng) / 2;
    // Determine zoom and tile projection
    const zoom = fitZoom(adjMinLat, adjMaxLat, adjMinLng, adjMaxLng, MAP_WIDTH, MAP_HEIGHT);
    const TILE = 256;
    const centerWX = lngToTileX(centerLng, zoom) * TILE;
    const centerWY = latToTileY(centerLat, zoom) * TILE;
    const originWX = centerWX - MAP_WIDTH / 2;
    const originWY = centerWY - MAP_HEIGHT / 2;
    const toX = (lng) => lngToTileX(lng, zoom) * TILE - originWX;
    const toY = (lat) => latToTileY(lat, zoom) * TILE - originWY;
    // Fetch Kakao map tiles (no CORS on server)
    const n = Math.pow(2, zoom);
    const tileXMin = Math.floor(originWX / TILE);
    const tileXMax = Math.floor((originWX + MAP_WIDTH) / TILE);
    const tileYMin = Math.floor(originWY / TILE);
    const tileYMax = Math.floor((originWY + MAP_HEIGHT) / TILE);
    // Use Kakao map tile URL (same as used in the SDK)
    // Kakao map tiles are publicly accessible on their CDN (no auth needed)
    const tileComposites = [];
    const tilePromises = [];
    for (let tx = tileXMin; tx <= tileXMax; tx++) {
        for (let ty = tileYMin; ty <= tileYMax; ty++) {
            const wrappedTx = ((tx % n) + n) % n;
            if (ty < 0 || ty >= n)
                continue;
            const tileUrl = `https://map.daumcdn.net/map_k3f_prod/bakery/image_map_png/PNGSD01/v21_axjht/0/${zoom}/${ty}/${wrappedTx}.png`;
            const dx = Math.round(tx * TILE - originWX);
            const dy = Math.round(ty * TILE - originWY);
            tilePromises.push(fetch(tileUrl)
                .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
                .then((buf) => {
                tileComposites.push({ input: Buffer.from(buf), left: dx, top: dy });
            })
                .catch(() => { }) // skip failed tiles
            );
        }
    }
    await Promise.all(tilePromises);
    // Build SVG overlay with route, markers, labels
    const depX = toX(dep.lng);
    const depY = toY(dep.lat);
    const destX = toX(dest.lng);
    const destY = toY(dest.lat);
    let polylineSvg = '';
    if (routePath && routePath.length >= 4) {
        const points = [];
        for (let i = 0; i < routePath.length; i += 2) {
            points.push(`${toX(routePath[i]).toFixed(1)},${toY(routePath[i + 1]).toFixed(1)}`);
        }
        const d = points.join(' ');
        polylineSvg = `
        <polyline points="${d}" fill="none" stroke="white" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
        <polyline points="${d}" fill="none" stroke="#2563eb" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
      `;
    }
    else {
        polylineSvg = `
        <line x1="${depX}" y1="${depY}" x2="${destX}" y2="${destY}" stroke="white" stroke-width="6" stroke-linecap="round"/>
        <line x1="${depX}" y1="${depY}" x2="${destX}" y2="${destY}" stroke="#2563eb" stroke-width="3" stroke-dasharray="8,4" stroke-linecap="round"/>
      `;
    }
    // Escape XML special chars in labels
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const distBadge = distanceKm != null
        ? (() => {
            const mx = (depX + destX) / 2;
            const my = (depY + destY) / 2 - 16;
            const label = `${distanceKm} km`;
            const bw = label.length * 9 + 20;
            return `
            <rect x="${mx - bw / 2}" y="${my - 14}" width="${bw}" height="28" rx="6" fill="#1e40af" stroke="white" stroke-width="2"/>
            <text x="${mx}" y="${my + 1}" fill="white" font-size="14" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${label}</text>
          `;
        })()
        : '';
    const svgOverlay = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${MAP_WIDTH}" height="${MAP_HEIGHT}">
        ${polylineSvg}
        <!-- Departure marker -->
        <circle cx="${depX}" cy="${depY}" r="12" fill="#2563eb" stroke="white" stroke-width="3"/>
        <text x="${depX}" y="${depY + 1}" fill="white" font-size="12" font-weight="bold" text-anchor="middle" dominant-baseline="middle">A</text>
        <!-- Destination marker -->
        <circle cx="${destX}" cy="${destY}" r="12" fill="#dc2626" stroke="white" stroke-width="3"/>
        <text x="${destX}" y="${destY + 1}" fill="white" font-size="12" font-weight="bold" text-anchor="middle" dominant-baseline="middle">B</text>
        <!-- Labels -->
        <rect x="${depX + 16}" y="${depY - 12}" width="${esc(depName).length * 8 + 10}" height="22" rx="3" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.15)"/>
        <text x="${depX + 21}" y="${depY + 1}" fill="#1e293b" font-size="12" font-weight="bold" dominant-baseline="middle">${esc(depName)}</text>
        <rect x="${destX + 16}" y="${destY - 12}" width="${esc(destName).length * 8 + 10}" height="22" rx="3" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.15)"/>
        <text x="${destX + 21}" y="${destY + 1}" fill="#1e293b" font-size="12" font-weight="bold" dominant-baseline="middle">${esc(destName)}</text>
        ${distBadge}
      </svg>
    `;
    // Compose: base (gray) + tiles + SVG overlay
    const image = (0, sharp_1.default)({
        create: {
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            channels: 3,
            background: { r: 232, g: 232, b: 232 }
        }
    })
        .composite([
        ...tileComposites,
        { input: Buffer.from(svgOverlay), top: 0, left: 0 }
    ])
        .png();
    const pngBuffer = await image.toBuffer();
    const base64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    const storagePath = `routemaps/${projectId || 'default'}/${committee}/${Date.now()}_route.png`;
    const result = await uploadFileToStorage({ name: 'route.png', data: base64 }, storagePath);
    return result;
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
function formatCurrency(amount) {
    return amount.toLocaleString('ko-KR') + '원';
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
    const requestedBy = data.requestedBy;
    const payee = data.payee;
    // Find finance reviewers for this committee
    const db = admin.firestore();
    const reviewerRoles = committee === 'operations' ? ['finance_ops', 'finance_prep'] : ['finance_prep'];
    const usersSnapshot = await db.collection('users').where('role', 'in', reviewerRoles).get();
    if (usersSnapshot.empty) {
        console.log('No finance reviewers found for committee:', committee);
        return;
    }
    const transporter = createTransporter();
    const committeeLabel = COMMITTEE_LABELS[committee] || committee;
    for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const email = user.email;
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
                <tr><td style="padding: 8px 0; color: #6b7280;">신청 금액</td><td style="padding: 8px 0; font-weight: 600;">${formatCurrency(totalAmount)}</td></tr>
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
function buildStatusChangeEmail(data, newStatus, requestId) {
    const totalAmount = data.totalAmount;
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
            <tr><td style="padding: 8px 0; color: #6b7280;">신청 금액</td><td style="padding: 8px 0; font-weight: 600;">${formatCurrency(totalAmount)}</td></tr>
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
            <tr><td style="padding: 8px 0; color: #6b7280;">신청 금액</td><td style="padding: 8px 0; font-weight: 600;">${formatCurrency(totalAmount)}</td></tr>
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
          <tr><td style="padding: 8px 0; color: #6b7280;">신청 금액</td><td style="padding: 8px 0; font-weight: 600;">${formatCurrency(totalAmount)}</td></tr>
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
    const db = admin.firestore();
    const transporter = createTransporter();
    // 1) pending → reviewed: 해당 위원회 승인자에게 승인 요청 알림
    if (oldStatus === 'pending' && newStatus === 'reviewed') {
        const committee = after.committee;
        const totalAmount = after.totalAmount;
        const payee = after.payee;
        const requestedByUid = after.requestedBy.uid;
        const committeeLabel = COMMITTEE_LABELS[committee] || committee;
        const reqId = event.params?.requestId || '';
        // 신청자의 역할 확인 (위원장이 신청한 건은 executive만 승인 가능)
        const requesterSnap = await db.doc(`users/${requestedByUid}`).get();
        const requesterRole = requesterSnap.exists ? requesterSnap.data()?.role : 'user';
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
        const usersSnapshot = await db.collection('users').where('role', 'in', approverRoles).get();
        for (const userDoc of usersSnapshot.docs) {
            const user = userDoc.data();
            const email = user.email;
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
                  <tr><td style="padding: 8px 0; color: #6b7280;">신청 금액</td><td style="padding: 8px 0; font-weight: 600;">${formatCurrency(totalAmount)}</td></tr>
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
function buildWeeklyDigestEmail(userName, sections) {
    const totalCount = sections.reduce((sum, s) => sum + s.count, 0);
    const sectionHtml = sections
        .filter((s) => s.count > 0)
        .map((s) => `<li>${s.label}: <strong>${s.count}건</strong></li>`)
        .join('');
    return {
        subject: `[지불/환불] 처리 대기 ${totalCount}건`,
        html: `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #2563eb; margin-bottom: 16px;">주간 처리 현황</h2>
        <p style="margin-bottom: 16px;">${escapeHtml(userName)}님, 처리가 필요한 건이 있습니다.</p>
        <ul style="margin-bottom: 20px; padding-left: 20px;">${sectionHtml}</ul>
        <p style="margin-top: 20px;"><a href="${APP_URL}/admin/requests" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">확인하기</a></p>
      </div>
    `
    };
}
// 매주 일요일 09:00 KST 처리 대기 알림
exports.weeklyApproverDigest = (0, scheduler_1.onSchedule)({
    schedule: 'every sunday 00:00',
    timeZone: 'UTC',
    secrets: [gmailUser, gmailAppPassword]
}, async () => {
    const db = admin.firestore();
    // 관련 역할 사용자 조회
    const relevantRoles = [
        'finance_ops',
        'finance_prep',
        'approver_ops',
        'approver_prep',
        'session_director',
        'logistic_admin',
        'executive'
    ];
    const usersSnapshot = await db.collection('users').where('role', 'in', relevantRoles).get();
    if (usersSnapshot.empty) {
        console.log('No relevant users found');
        return;
    }
    // pending 신청서 (검토 대상) - 위원회별 집계
    const pendingSnapshot = await db.collection('requests').where('status', '==', 'pending').get();
    let opsPendingCount = 0;
    let prepPendingCount = 0;
    for (const doc of pendingSnapshot.docs) {
        const committee = doc.data().committee;
        if (committee === 'operations')
            opsPendingCount++;
        else if (committee === 'preparation')
            prepPendingCount++;
    }
    // reviewed 신청서 (승인 대상) - 위원회별 집계
    const reviewedSnapshot = await db.collection('requests').where('status', '==', 'reviewed').get();
    let opsReviewedCount = 0;
    let prepReviewedCount = 0;
    for (const doc of reviewedSnapshot.docs) {
        const committee = doc.data().committee;
        if (committee === 'operations')
            opsReviewedCount++;
        else if (committee === 'preparation')
            prepReviewedCount++;
    }
    const totalReviewedCount = reviewedSnapshot.size;
    // approved 미정산 건수
    const approvedSnapshot = await db.collection('requests').where('status', '==', 'approved').get();
    const totalApprovedUnsettledCount = approvedSnapshot.size;
    const transporter = createTransporter();
    for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const role = user.role;
        const email = user.email;
        const name = (user.displayName || user.name || '');
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
            // 운영위 승인자: 운영위 승인 대기
            sections.push({ label: '운영위 승인 대기', count: opsReviewedCount });
        }
        else if (role === 'approver_prep') {
            // 준비위 승인자: 준비위 승인 대기
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
        else if (role === 'executive') {
            // 대회장: 전체 승인 대기 + 미정산
            sections.push({ label: '승인 대기', count: totalReviewedCount });
            sections.push({ label: '승인 미정산', count: totalApprovedUnsettledCount });
        }
        const totalCount = sections.reduce((sum, s) => sum + s.count, 0);
        if (totalCount === 0)
            continue;
        const { subject, html } = buildWeeklyDigestEmail(name, sections);
        try {
            await transporter.sendMail({
                from: `지불/환불 시스템 <${gmailUser.value()}>`,
                to: email,
                subject,
                html
            });
            console.log(`Weekly digest sent to ${email}: ${totalCount} items`);
        }
        catch (error) {
            console.error(`Failed to send weekly digest to ${email}:`, error);
        }
    }
});
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