import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onDocumentUpdated, onDocumentCreated } from 'firebase-functions/v2/firestore'
import { defineSecret } from 'firebase-functions/params'
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import * as nodemailer from 'nodemailer'
import { randomUUID } from 'node:crypto'
import {
  splitCorporateCard,
  canSplitRequest,
  SplitValidationError
} from './lib/splitCorporateCard'
import { resolvePendingSignupRecipients } from './lib/pendingSignupRecipients'

admin.initializeApp()

// --- Email notification secrets & config ---
const gmailUser = defineSecret('GMAIL_USER')
const gmailAppPassword = defineSecret('GMAIL_APP_PASSWORD')
const kakaoMobilityKey = defineSecret('KAKAO_MOBILITY_API_KEY')
const openaiApiKey = defineSecret('OPENAI_API_KEY')
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY')

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser.value(),
      pass: gmailAppPassword.value()
    }
  })
}

const APP_URL = process.env.APP_URL!
const STORAGE_BUCKET = process.env.STORAGE_BUCKET!
const bucket = admin.storage().bucket(STORAGE_BUCKET)

interface FileInput {
  name: string
  data: string
}

interface UploadResult {
  fileName: string
  storagePath: string
  url: string
}

const MAX_UPLOAD_BYTES = 750 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf'])

// Verify file content matches its declared MIME using magic bytes — prevents a
// client from uploading an arbitrary blob (e.g. an executable) labeled as image/png.
function detectMimeFromMagic(buffer: Buffer): string | null {
  if (buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
      buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) {
    return 'image/png'
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString() === '%PDF') {
    return 'application/pdf'
  }
  return null
}

// Strip directory separators / NUL / control chars to keep storagePath predictable.
function sanitizeFilename(name: string): string {
  // Replace control chars and path separators, and collapse runs of dots so
  // saved-webpage names (e.g. Coupang "...card-receipt_view..pdf") never put a
  // ".." into the storage path. Keeps download path-traversal validation happy.
  return (
    name
      .replace(/[\x00-\x1f/\\]/g, '_')
      .replace(/\.{2,}/g, '.')
      .slice(0, 200) || 'file'
  )
}

async function uploadFileToStorage(file: FileInput, storagePath: string): Promise<UploadResult> {
  if (!file?.data || typeof file.data !== 'string' || !file.data.startsWith('data:')) {
    throw new HttpsError('invalid-argument', 'File data must be a base64 data URI')
  }
  const commaIdx = file.data.indexOf(',')
  if (commaIdx < 0) {
    throw new HttpsError('invalid-argument', 'Malformed data URI')
  }
  const header = file.data.slice(0, commaIdx) // e.g. "data:image/png;base64"
  const declaredMime = header.split(';')[0].split(':')[1]
  if (!ALLOWED_MIME_TYPES.has(declaredMime)) {
    throw new HttpsError('invalid-argument', `Disallowed file type: ${declaredMime}`)
  }

  const base64Data = file.data.slice(commaIdx + 1)
  const buffer = Buffer.from(base64Data, 'base64')

  if (buffer.length === 0) {
    throw new HttpsError('invalid-argument', 'Empty file')
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new HttpsError(
      'invalid-argument',
      `File exceeds ${Math.floor(MAX_UPLOAD_BYTES / 1024)}KB limit`
    )
  }

  const actualMime = detectMimeFromMagic(buffer)
  if (actualMime !== declaredMime) {
    throw new HttpsError('invalid-argument', 'File contents do not match declared type')
  }

  const downloadToken = randomUUID()
  const fileRef = bucket.file(storagePath)
  await fileRef.save(buffer, {
    metadata: {
      contentType: actualMime,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken
      }
    }
  })

  const encodedPath = encodeURIComponent(storagePath)
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`

  return {
    fileName: file.name,
    storagePath,
    url
  }
}

// 영수증 업로드
export const uploadReceiptsV2 = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  const { files, committee, projectId } = request.data as {
    files: FileInput[]
    committee: string
    projectId?: string
  }
  if (!files || files.length === 0) {
    throw new HttpsError('invalid-argument', 'No files provided')
  }

  const results: UploadResult[] = []
  for (const file of files) {
    const safeName = sanitizeFilename(file.name)
    const storagePath = `receipts/${projectId || 'default'}/${committee}/${Date.now()}_${safeName}`
    results.push(await uploadFileToStorage(file, storagePath))
  }
  return results
})

// 통장사본 업로드
export const uploadBankBookV2 = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  const { file } = request.data as { file: FileInput }
  if (!file) {
    throw new HttpsError('invalid-argument', 'No file provided')
  }

  // Delete old bank book file if exists
  const userDoc = await admin.firestore().doc(`users/${request.auth.uid}`).get()
  if (userDoc.exists) {
    const oldPath = userDoc.data()?.bankBookPath
    if (oldPath) {
      try {
        await bucket.file(oldPath).delete()
      } catch {
        // Ignore if file already deleted
      }
    }
  }

  const storagePath = `bankbook/${request.auth.uid}/${Date.now()}_${sanitizeFilename(file.name)}`
  return await uploadFileToStorage(file, storagePath)
})

// 업체 통장사본 업로드
export const uploadVendorBankBook = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  const { file } = request.data as { file: FileInput }
  if (!file) {
    throw new HttpsError('invalid-argument', 'No file provided')
  }

  // No old-file deletion — vendor bank books are per-request, not per-user
  const storagePath = `vendor-bankbook/${request.auth.uid}/${Date.now()}_${sanitizeFilename(file.name)}`
  return await uploadFileToStorage(file, storagePath)
})

// 경로맵 업로드
export const uploadRouteMap = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  const { file, committee, projectId } = request.data as {
    file: FileInput
    committee: string
    projectId: string
  }
  if (!file) {
    throw new HttpsError('invalid-argument', 'No file provided')
  }

  const storagePath = `routemaps/${projectId || 'default'}/${committee}/${Date.now()}_route.png`
  return await uploadFileToStorage(file, storagePath)
})

// Delete storage files by paths (used to clean up old route maps on resubmit)
export const deleteStorageFiles = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }
  const { paths } = request.data as { paths: string[] }
  if (!paths || paths.length === 0) return { deleted: 0 }
  // Only allow deleting routemap files for safety
  const safePaths = paths.filter((p) => p.startsWith('routemaps/'))
  await Promise.all(safePaths.map((p) => bucket.file(p).delete().catch(() => {})))
  return { deleted: safePaths.length }
})

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
])

/**
 * True if the user has any "staff" role anywhere in the system —
 * i.e., system admin/super_admin OR has a staff-level ProjectRole in any project.
 * Used for the bankbook bypass: finance/approver staff need to see other users'
 * bank info for verification.
 */
async function hasStaffRoleAnywhere(uid: string): Promise<boolean> {
  const db = admin.firestore()
  const userDoc = await db.doc(`users/${uid}`).get()
  const data = userDoc.data()
  if (!data) return false

  // System-level staff
  if (data.systemRole === 'super_admin' || data.systemRole === 'admin') return true

  // Project-level: scan all projects (small N in this app — typically <10)
  const projects = await db.collection('projects').get()
  for (const p of projects.docs) {
    const role = p.data()?.memberRoles?.[uid]
    if (role && STAFF_ROLES.has(role)) return true
  }
  return false
}

async function uidsWithProjectRoles(projectId: string | undefined | null, roles: string[]): Promise<{ uid: string; role: string }[]> {
  if (!projectId) return []
  const db = admin.firestore()
  const projDoc = await db.doc(`projects/${projectId}`).get()
  const data = projDoc.data() ?? {}
  const result: { uid: string; role: string }[] = []

  for (const [uid, r] of Object.entries((data.memberRoles ?? {}) as Record<string, string>)) {
    if (roles.includes(r)) result.push({ uid, role: r })
  }

  return result
}

/**
 * 호출자의 이 프로젝트 내 유효 역할. super_admin 은 모든 프로젝트에서 admin 으로
 * 승격된다 — 클라이언트의 useProjectRole 과 같은 규칙이다.
 */
async function callerProjectRole(
  projectId: string | undefined | null,
  uid: string
): Promise<string | null> {
  const db = admin.firestore()
  const userDoc = await db.doc(`users/${uid}`).get()
  if (userDoc.data()?.systemRole === 'super_admin') return 'admin'
  if (!projectId) return null
  const projDoc = await db.doc(`projects/${projectId}`).get()
  const roles = (projDoc.data()?.memberRoles ?? {}) as Record<string, string>
  return roles[uid] ?? null
}

function getSystemRole(d: FirebaseFirestore.DocumentData | undefined): string | null {
  if (!d) return null
  return d.systemRole ?? null
}

async function assertCanReadStoragePath(uid: string, storagePath: string): Promise<void> {
  // Reject path traversal and absolute paths up front. We check for a standalone
  // ".." path *segment* rather than a bare ".." substring: filenames are sanitized
  // at upload (slashes/backslashes replaced), so ".." inside a filename
  // (e.g. "card-receipt_view..pdf") can never escape its directory and is legitimate.
  const segments = storagePath.split('/')
  if (storagePath.startsWith('/') || segments.some((s) => s === '..')) {
    throw new HttpsError('invalid-argument', 'Invalid storage path')
  }
  const isStaff = await hasStaffRoleAnywhere(uid)

  // bankbook/{ownerUid}/... and vendor-bankbook/{ownerUid}/...
  const bankMatch = storagePath.match(/^(?:vendor-)?bankbook\/([^/]+)\//)
  if (bankMatch) {
    const ownerUid = bankMatch[1]
    if (ownerUid !== uid && !isStaff) {
      throw new HttpsError('permission-denied', 'Not authorized to read this file')
    }
    return
  }

  // receipts/{projectId}/... and routemaps/{projectId}/... — staff or project member
  const projectMatch = storagePath.match(/^(?:receipts|routemaps)\/([^/]+)\//)
  if (projectMatch) {
    if (isStaff) return
    const projectId = projectMatch[1]
    const proj = await admin.firestore().doc(`projects/${projectId}`).get()
    const memberRoles = proj.data()?.memberRoles as Record<string, string> | undefined
    if (!memberRoles || memberRoles[uid] === undefined) {
      throw new HttpsError('permission-denied', 'Not authorized to read this file')
    }
    return
  }

  // Unknown path prefix — deny by default.
  throw new HttpsError('permission-denied', 'Not authorized to read this file')
}

// 파일 다운로드 프록시 (CORS 우회)
export const downloadFileV2 = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  const { storagePath } = request.data as { storagePath: string }
  if (!storagePath || typeof storagePath !== 'string') {
    throw new HttpsError('invalid-argument', 'No storage path provided')
  }

  await assertCanReadStoragePath(request.auth.uid, storagePath)

  const fileRef = bucket.file(storagePath)
  const [exists] = await fileRef.exists()
  if (!exists) {
    throw new HttpsError('not-found', 'File not found')
  }

  const [buffer] = await fileRef.download()
  const [metadata] = await fileRef.getMetadata()

  return {
    data: buffer.toString('base64'),
    contentType: metadata.contentType || 'application/octet-stream',
    fileName: storagePath.split('/').pop() || 'file'
  }
})

// 30일 지난 삭제된 프로젝트 자동 정리 (매일 실행)
export const cleanupDeletedProjects = onSchedule('every 24 hours', async () => {
  const db = admin.firestore()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const snapshot = await db
    .collection('projects')
    .where('isActive', '==', false)
    .where('deletedAt', '<=', thirtyDaysAgo)
    .get()

  for (const projectDoc of snapshot.docs) {
    const projectId = projectDoc.id
    console.log(`Permanently deleting project: ${projectId}`)

    // Collect all storage paths to delete
    const storagePaths: string[] = []

    // Delete requests + collect receipt paths
    const requests = await db.collection('requests').where('projectId', '==', projectId).get()
    for (const reqDoc of requests.docs) {
      for (const receipt of reqDoc.data().receipts || []) {
        if (receipt.storagePath) storagePaths.push(receipt.storagePath)
      }
    }
    for (let i = 0; i < requests.docs.length; i += 500) {
      const batch = db.batch()
      requests.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }

    // Delete settlements + collect receipt paths
    const settlements = await db.collection('settlements').where('projectId', '==', projectId).get()
    for (const setDoc of settlements.docs) {
      for (const receipt of setDoc.data().receipts || []) {
        if (receipt.storagePath) storagePaths.push(receipt.storagePath)
      }
    }
    for (let i = 0; i < settlements.docs.length; i += 500) {
      const batch = db.batch()
      settlements.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }

    // Delete all collected storage files
    await Promise.all(
      storagePaths.map((p) =>
        bucket
          .file(p)
          .delete()
          .catch(() => {
            /* ignore missing */
          })
      )
    )

    // Delete entire receipts folder for this project (catch any orphaned files)
    const [orphanedFiles] = await bucket.getFiles({ prefix: `receipts/${projectId}/` })
    await Promise.all(
      orphanedFiles.map((f) =>
        f.delete().catch(() => {
          /* ignore */
        })
      )
    )

    // Delete orphaned route map files
    const [orphanedRouteMaps] = await bucket.getFiles({ prefix: `routemaps/${projectId}/` })
    await Promise.all(
      orphanedRouteMaps.map((f) =>
        f.delete().catch(() => {
          /* ignore */
        })
      )
    )

    // Delete the project document
    await projectDoc.ref.delete()
    console.log(
      `Deleted project ${projectId}: ${requests.size} requests, ${settlements.size} settlements, ${storagePaths.length + orphanedFiles.length + orphanedRouteMaps.length} files`
    )
  }
})

// 사용자 삭제 (Firestore 문서 + Firebase Auth 계정)
export const deleteUserAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  // 호출자가 admin 또는 super_admin인지 확인
  const callerDoc = await admin.firestore().doc(`users/${request.auth.uid}`).get()
  const callerRole = getSystemRole(callerDoc.data())
  if (callerRole !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Only super_admin can delete users')
  }

  const { uid } = request.data as { uid: string }
  if (!uid) {
    throw new HttpsError('invalid-argument', 'User UID is required')
  }

  // super_admin은 삭제 불가
  const targetDoc = await admin.firestore().doc(`users/${uid}`).get()
  if (targetDoc.exists && getSystemRole(targetDoc.data()) === 'super_admin') {
    throw new HttpsError('permission-denied', 'Cannot delete super_admin')
  }

  // 본인 삭제 불가
  if (uid === request.auth.uid) {
    throw new HttpsError('permission-denied', 'Cannot delete yourself')
  }

  // Firestore 문서 삭제
  await admin.firestore().doc(`users/${uid}`).delete()

  // Firebase Auth 계정 삭제
  try {
    await admin.auth().deleteUser(uid)
  } catch (error) {
    console.warn(`Auth account deletion failed for ${uid}:`, error)
  }

  // 프로젝트 memberRoles에서 제거
  const projectsSnapshot = await admin.firestore().collection('projects').get()
  for (const projectDoc of projectsSnapshot.docs) {
    const memberRoles = (projectDoc.data()?.memberRoles ?? {}) as Record<string, unknown>
    if (memberRoles[uid] !== undefined) {
      await projectDoc.ref.update({ [`memberRoles.${uid}`]: FieldValue.delete() })
    }
  }

  console.log(`User ${uid} deleted by ${request.auth.uid}`)
  return { success: true }
})

/**
 * Douglas-Peucker line simplification for [lng, lat, lng, lat, ...] flat arrays.
 */
function simplifyPath(coords: number[], tolerance = 0.0001): number[] {
  const points: [number, number][] = []
  for (let i = 0; i < coords.length; i += 2) {
    points.push([coords[i], coords[i + 1]])
  }
  if (points.length <= 2) return coords

  function perpendicularDistance(
    pt: [number, number],
    lineStart: [number, number],
    lineEnd: [number, number]
  ): number {
    const dx = lineEnd[0] - lineStart[0]
    const dy = lineEnd[1] - lineStart[1]
    const mag = Math.sqrt(dx * dx + dy * dy)
    if (mag === 0) return Math.sqrt((pt[0] - lineStart[0]) ** 2 + (pt[1] - lineStart[1]) ** 2)
    const u = ((pt[0] - lineStart[0]) * dx + (pt[1] - lineStart[1]) * dy) / (mag * mag)
    const closestX = lineStart[0] + u * dx
    const closestY = lineStart[1] + u * dy
    return Math.sqrt((pt[0] - closestX) ** 2 + (pt[1] - closestY) ** 2)
  }

  function simplify(pts: [number, number][], tol: number): [number, number][] {
    if (pts.length <= 2) return pts
    let maxDist = 0
    let maxIdx = 0
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpendicularDistance(pts[i], pts[0], pts[pts.length - 1])
      if (d > maxDist) {
        maxDist = d
        maxIdx = i
      }
    }
    if (maxDist > tol) {
      const left = simplify(pts.slice(0, maxIdx + 1), tol)
      const right = simplify(pts.slice(maxIdx), tol)
      return [...left.slice(0, -1), ...right]
    }
    return [pts[0], pts[pts.length - 1]]
  }

  const simplified = simplify(points, tolerance)
  const result: number[] = []
  for (const [x, y] of simplified) {
    result.push(x, y)
  }
  return result
}

// --- Kakao Mobility distance calculation ---
export const calculateDistance = onCall({ secrets: [kakaoMobilityKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  const { origin, destination } = request.data as {
    origin: { lat: number; lng: number }
    destination: { lat: number; lng: number }
  }

  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
    throw new HttpsError('invalid-argument', 'Origin and destination coordinates are required')
  }

  // Kakao Mobility uses longitude,latitude order
  // priority=DISTANCE: 환급 지침 기준 "거리우선" 경로 사용
  const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&priority=DISTANCE`

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${kakaoMobilityKey.value()}`
    }
  })

  if (!response.ok) {
    console.error('Kakao Mobility API error:', response.status, await response.text())
    throw new HttpsError('internal', 'Failed to calculate distance')
  }

  const data = (await response.json()) as {
    routes: {
      result_code: number
      summary: { distance: number }
      sections: { roads: { vertexes: number[] }[] }[]
    }[]
  }
  const routes = data.routes
  if (!routes || routes.length === 0 || routes[0].result_code !== 0) {
    throw new HttpsError('not-found', 'No route found')
  }

  const distanceMeters = routes[0].summary.distance

  // Extract route path coordinates [lng, lat, lng, lat, ...]
  const routePath: number[] = []
  for (const section of routes[0].sections) {
    for (const road of section.roads) {
      routePath.push(...road.vertexes)
    }
  }

  return { distanceMeters, routePath: simplifyPath(routePath) }
})

interface SplitCorporateCardInput {
  requestId: string
  corporateItemIndexes: number[]
  corporateReceiptPaths: string[]
}

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
export const splitCorporateCardRequest = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in')
  const uid = request.auth.uid

  const { requestId, corporateItemIndexes, corporateReceiptPaths } =
    request.data as SplitCorporateCardInput

  if (!requestId || typeof requestId !== 'string') {
    throw new HttpsError('invalid-argument', 'requestId is required')
  }
  if (!Array.isArray(corporateItemIndexes) || !Array.isArray(corporateReceiptPaths)) {
    throw new HttpsError('invalid-argument', 'corporateItemIndexes and corporateReceiptPaths must be arrays')
  }

  const db = admin.firestore()
  const reqRef = db.doc(`requests/${requestId}`)
  // 새 법인카드 문서 ref 는 트랜잭션 밖에서 만든다 — 경합 시 Firestore 가 콜백을
  // 재시도할 수 있는데, 안에서 만들면 재시도마다 새 id 가 발급되어 버린다.
  const newRef = db.collection('requests').doc()

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(reqRef)
    if (!snap.exists) throw new HttpsError('not-found', 'Request not found')
    const data = snap.data()!

    // 권한 확인을 상태/유형 확인보다 먼저 한다 — 그렇지 않으면 프로젝트에 아무 역할도
    // 없는 사용자도 임의의 requestId 로 상태와 법인카드 여부를 알아낼 수 있다.
    // 역할 조회는 일반 읽기로 남긴다 — 멤버십은 스냅샷 격리가 필요 없고, 트랜잭션에
    // 넣으면 경합 범위만 불필요하게 넓어진다.
    const role = await callerProjectRole(data.projectId, uid)
    if (!canSplitRequest(role, data.committee)) {
      throw new HttpsError('permission-denied', 'SPLIT_FORBIDDEN')
    }

    if (data.status !== 'pending' && data.status !== 'reviewed') {
      throw new HttpsError('failed-precondition', 'SPLIT_STATUS_NOT_ALLOWED')
    }
    if (data.isCorporateCard === true) {
      throw new HttpsError('failed-precondition', 'SPLIT_ALREADY_CORPORATE_CARD')
    }
    if (data.isVendorRequest === true) {
      throw new HttpsError('failed-precondition', 'SPLIT_VENDOR_NOT_ALLOWED')
    }

    // 운영예산 편입 항목은 {requestId, itemIndex} 로 신청서를 참조한다. 분리는 items
    // 인덱스를 밀어버리므로 편입이 하나라도 있으면 거부한다.
    const inclusionsQuery = db
      .collection(`projects/${data.projectId}/opsBudgetInclusions`)
      .where('requestId', '==', requestId)
      .limit(1)
    const inclusions = await tx.get(inclusionsQuery)
    if (!inclusions.empty) {
      throw new HttpsError('failed-precondition', 'SPLIT_OPS_BUDGET_INCLUDED')
    }

    // IIFE 로 감싼다 — try 범위를 splitCorporateCard 호출 하나로 좁게 유지하고,
    // 그 안에서 던져진 검증 에러를 던진 지점에서 바로 HttpsError 로 변환하기 위함이다.
    const split = (() => {
      try {
        return splitCorporateCard({
          items: data.items ?? [],
          receipts: data.receipts ?? [],
          receiptDisplaySizes: data.receiptDisplaySizes,
          corporateItemIndexes,
          corporateReceiptPaths
        })
      } catch (e) {
        if (e instanceof SplitValidationError) throw new HttpsError('invalid-argument', e.reason)
        throw e
      }
    })()

    // 원본: 남은 항목만 남기고 결재 상태를 pending 으로 되돌린다. 금액이 바뀌면
    // 승인 권한 기준(directorApprovalThreshold)도 바뀌므로 재검토를 강제한다.
    const originalUpdate: Record<string, unknown> = {
      items: split.original.items,
      receipts: split.original.receipts,
      totalAmount: split.original.totalAmount,
      totalAmountUsd:
        split.original.totalAmountUsd !== undefined
          ? split.original.totalAmountUsd
          : FieldValue.delete(),
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      approvedBy: null,
      approvedAt: null,
      approvalSignature: null,
      rejectionReason: null
    }
    if (split.original.receiptDisplaySizes !== undefined) {
      originalUpdate.receiptDisplaySizes = split.original.receiptDisplaySizes
    }
    tx.update(reqRef, originalUpdate)

    // 신규: 신원 필드만 복사한다. isVendorRequest/vendorBankBook* 는 복사하지 않는다 —
    // 신청 유형은 일반/거래처/법인카드 중 하나만 고르는 배타적 선택이고, 법인카드로
    // 결제된 부분은 업체에 송금되지 않는다.
    const corporateDoc: Record<string, unknown> = {
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
      createdAt: FieldValue.serverTimestamp()
    }
    if (split.corporate.totalAmountUsd !== undefined) {
      corporateDoc.totalAmountUsd = split.corporate.totalAmountUsd
    }
    if (split.corporate.receiptDisplaySizes !== undefined) {
      corporateDoc.receiptDisplaySizes = split.corporate.receiptDisplaySizes
    }
    tx.set(newRef, corporateDoc)
  })

  return { originalId: requestId, corporateCardId: newRef.id }
})


// --- Email Notification Functions ---

const COMMITTEE_LABELS: Record<string, string> = {
  operations: '운영위원회',
  preparation: '준비위원회'
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatCurrency(amount: number, amountUsd?: number): string {
  const parts: string[] = []
  if (amount > 0) parts.push(amount.toLocaleString('ko-KR') + '원')
  if (amountUsd && amountUsd > 0) {
    parts.push(
      '$' +
        amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    )
  }
  if (parts.length === 0) return '0원'
  return parts.join(' + ')
}

function formatDate(date: Date | admin.firestore.Timestamp | null): string {
  if (!date) return '-'
  const d = date instanceof Date ? date : date.toDate()
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 신청서 생성 시 → 해당 위원회 재정 담당자에게 검토 요청 알림
export const onRequestCreated = onDocumentCreated(
  {
    document: 'requests/{requestId}',
    secrets: [gmailUser, gmailAppPassword]
  },
  async (event) => {
    const data = event.data?.data()
    if (!data) return

    const committee = data.committee as string
    const totalAmount = data.totalAmount as number
    const totalAmountUsd = data.totalAmountUsd as number | undefined
    const requestedBy = data.requestedBy as { name: string; email: string }
    const payee = data.payee as string
    const projectId = data.projectId as string

    // Find finance reviewers for this committee (project-scoped)
    const db = admin.firestore()
    const reviewerRoles =
      committee === 'operations' ? ['finance_ops', 'finance_prep'] : ['finance_prep']

    const recipients = await uidsWithProjectRoles(projectId, reviewerRoles)

    if (recipients.length === 0) {
      console.log('No finance reviewers found for committee:', committee)
      return
    }

    const transporter = createTransporter()
    const committeeLabel = COMMITTEE_LABELS[committee] || committee

    const recipientDocs = await Promise.all(recipients.map(r => db.doc(`users/${r.uid}`).get()))
    for (const userDoc of recipientDocs) {
      const user = userDoc.data()
      const email = user?.email as string | undefined
      if (!email) continue

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
        })
        console.log(`New request notification sent to ${email}`)
      } catch (error) {
        console.error(`Failed to send new request notification to ${email}:`, error)
      }
    }
  }
)

// 신규 가입 → default 대회의 admin 에게 승인 대기 알림
export const onUserCreatedNotifyAdmins = onDocumentCreated(
  {
    document: 'users/{uid}',
    secrets: [gmailUser, gmailAppPassword]
  },
  async (event) => {
    const data = event.data?.data()
    if (!data) return

    // 정상 가입은 항상 assignedProjectCount: 0 으로 생성된다(AuthContext.tsx:110).
    // 필드 자체가 없는 문서(레거시/시드 등)도 안전한 기본값으로 간주해 대기 상태로 처리한다.
    // 이미 0이 아닌 값을 가진 문서만 건너뛴다.
    const assigned = data.assignedProjectCount
    if (assigned !== 0 && assigned !== undefined && assigned !== null) return

    const db = admin.firestore()

    const settingsSnap = await db.doc('settings/global').get()
    const defaultProjectId = (settingsSnap.data()?.defaultProjectId as string | undefined) ?? null

    let memberRoles: Record<string, string> | null = null
    if (defaultProjectId) {
      const projSnap = await db.doc(`projects/${defaultProjectId}`).get()
      memberRoles = projSnap.exists
        ? ((projSnap.data()?.memberRoles ?? {}) as Record<string, string>)
        : null
    }

    const superAdminSnap = await db
      .collection('users')
      .where('systemRole', '==', 'super_admin')
      .get()
    const superAdminUids = superAdminSnap.docs.map((d) => d.id)

    const recipientUids = resolvePendingSignupRecipients(
      defaultProjectId,
      memberRoles,
      superAdminUids
    )

    if (recipientUids.length === 0) {
      console.error('No recipient for pending signup notification', {
        newUserUid: event.params.uid,
        defaultProjectId
      })
      return
    }

    // 신규 가입자 본인이 수신자 목록에 있으면 제외한다(첫 super_admin 시딩 등).
    const targets = recipientUids.filter((uid) => uid !== event.params.uid)
    if (targets.length === 0) {
      console.log('Pending signup notification skipped: new user is the only recipient', {
        newUserUid: event.params.uid
      })
      return
    }

    const transporter = createTransporter()

    // AppUser 에는 createdAt 필드가 없다(AuthContext.tsx:100-111). 문서에서 읽으면
    // 항상 비므로 이벤트 발생 시각을 쓴다.
    const signedUpAt = formatDate(new Date(event.time))
    const name = (data.displayName as string) || (data.name as string) || '(이름 미입력)'
    const email = (data.email as string) || '-'

    const recipientDocs = await Promise.all(targets.map((uid) => db.doc(`users/${uid}`).get()))
    for (const userDoc of recipientDocs) {
      const to = userDoc.data()?.email as string | undefined
      if (!to) continue

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
        })
        console.log(`Pending signup notification sent to ${to}`)
      } catch (error) {
        console.error(`Failed to send pending signup notification to ${to}:`, error)
      }
    }
  }
)

function buildStatusChangeEmail(
  data: Record<string, unknown>,
  newStatus: string,
  requestId?: string
): { subject: string; html: string } {
  const totalAmount = data.totalAmount as number
  const totalAmountUsd = data.totalAmountUsd as number | undefined
  const approvedBy = data.approvedBy as { name: string } | null
  const rejectionReason = data.rejectionReason as string | null
  const approvedAt = data.approvedAt as admin.firestore.Timestamp | null

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
    }
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
    }
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
  }
}

// 신청서 상태 변경 시 이메일 알림
export const onRequestStatusChange = onDocumentUpdated(
  {
    document: 'requests/{requestId}',
    secrets: [gmailUser, gmailAppPassword]
  },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!before || !after) return

    const oldStatus = before.status as string
    const newStatus = after.status as string

    const db = admin.firestore()
    const transporter = createTransporter()

    // 1) pending → reviewed: 해당 위원회 승인자에게 승인 요청 알림
    if (oldStatus === 'pending' && newStatus === 'reviewed') {
      const committee = after.committee as string
      const totalAmount = after.totalAmount as number
      const totalAmountUsd = after.totalAmountUsd as number | undefined
      const payee = after.payee as string
      const requestedByUid = (after.requestedBy as { uid: string }).uid
      const committeeLabel = COMMITTEE_LABELS[committee] || committee
      const reqId = event.params?.requestId || ''
      const projectId = after.projectId as string

      // 신청자의 역할 확인 (위원장이 신청한 건은 executive만 승인 가능)
      const projectSnap = await db.doc(`projects/${projectId}`).get()
      const requesterRole =
        (projectSnap.data()?.memberRoles?.[requestedByUid] as string | undefined) ?? 'user'
      const isDirectorRequest =
        requesterRole === 'session_director' || requesterRole === 'logistic_admin'

      let approverRoles: string[]
      if (isDirectorRequest) {
        // 위원장이 신청한 건 → executive만 승인 가능
        approverRoles = ['executive']
      } else {
        approverRoles =
          committee === 'operations'
            ? ['approver_ops', 'session_director', 'executive']
            : ['approver_prep', 'logistic_admin', 'executive']
      }

      const recipients = await uidsWithProjectRoles(projectId, approverRoles)
      const recipientDocs = await Promise.all(recipients.map(r => db.doc(`users/${r.uid}`).get()))

      for (const userDoc of recipientDocs) {
        const user = userDoc.data()
        const email = user?.email as string | undefined
        if (!email) continue

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
          })
          console.log(`Approval request notification sent to ${email}`)
        } catch (error) {
          console.error(`Failed to send approval notification to ${email}:`, error)
        }
      }
      return
    }

    if (newStatus === 'cancelled') return

    // 2) 신청자에게 알림: reviewed→approved, pending|reviewed→rejected, approved→force_rejected
    const shouldNotifyRequester =
      (oldStatus === 'reviewed' && newStatus === 'approved') ||
      ((oldStatus === 'pending' || oldStatus === 'reviewed') && newStatus === 'rejected') ||
      (oldStatus === 'approved' && newStatus === 'force_rejected')

    if (!shouldNotifyRequester) return

    const requestedBy = after.requestedBy as { email: string; name: string } | undefined
    if (!requestedBy?.email) {
      console.warn('No requestedBy email found, skipping notification')
      return
    }

    const requestId = event.params?.requestId || ''
    const { subject, html } = buildStatusChangeEmail(after, newStatus, requestId)

    try {
      await transporter.sendMail({
        from: `지불/환불 시스템 <${gmailUser.value()}>`,
        to: requestedBy.email,
        subject,
        html
      })
      console.log(`Status change email sent to ${requestedBy.email} (${oldStatus}→${newStatus})`)
    } catch (error) {
      console.error('Failed to send status change email:', error)
    }
  }
)

function buildWeeklyDigestEmail(
  userName: string,
  sections: { label: string; count: number }[]
): { subject: string; html: string } {
  const totalCount = sections.reduce((sum, s) => sum + s.count, 0)
  const sectionHtml = sections
    .filter((s) => s.count > 0)
    .map((s) => `<li>${s.label}: <strong>${s.count}건</strong></li>`)
    .join('')

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
  }
}

// 매주 일요일 09:00 KST 처리 대기 알림
export const weeklyApproverDigest = onSchedule(
  {
    // UTC 일요일 00:00 = KST 일요일 09:00 (한국은 DST 없음).
    schedule: 'every sunday 00:00',
    timeZone: 'UTC',
    secrets: [gmailUser, gmailAppPassword]
  },
  async () => {
    const db = admin.firestore()

    // 관련 역할 사용자 조회 (프로젝트 범위: 모든 프로젝트에서 집계)
    const relevantRoles = [
      'finance_ops',
      'finance_prep',
      'approver_ops',
      'approver_prep',
      'session_director',
      'logistic_admin',
      'executive'
    ]

    // Collect recipients across all projects (uid -> project-scoped role, first match wins)
    const projectsSnap = await db.collection('projects').get()
    const recipientMap = new Map<string, string>()  // uid -> role
    for (const projDoc of projectsSnap.docs) {
      const perProject = await uidsWithProjectRoles(projDoc.id, relevantRoles)
      for (const { uid, role } of perProject) {
        if (!recipientMap.has(uid)) recipientMap.set(uid, role)
      }
    }

    // super_admin은 개별 신청/상태변경 알림은 받지 않지만, 주간 다이제스트는 받음
    const superSnap = await db.collection('users').where('systemRole', '==', 'super_admin').get()
    for (const d of superSnap.docs) {
      if (!recipientMap.has(d.id)) recipientMap.set(d.id, 'admin')
    }

    if (recipientMap.size === 0) {
      console.log('No relevant users found')
      return
    }

    // pending 신청서 (검토 대상) - 위원회별 집계
    const pendingSnapshot = await db.collection('requests').where('status', '==', 'pending').get()

    let opsPendingCount = 0
    let prepPendingCount = 0
    for (const doc of pendingSnapshot.docs) {
      const committee = doc.data().committee as string
      if (committee === 'operations') opsPendingCount++
      else if (committee === 'preparation') prepPendingCount++
    }

    // reviewed 신청서 (승인 대상) - 위원회별 집계
    const reviewedSnapshot = await db.collection('requests').where('status', '==', 'reviewed').get()

    let opsReviewedCount = 0
    let prepReviewedCount = 0
    for (const doc of reviewedSnapshot.docs) {
      const committee = doc.data().committee as string
      if (committee === 'operations') opsReviewedCount++
      else if (committee === 'preparation') prepReviewedCount++
    }
    const totalReviewedCount = reviewedSnapshot.size

    // approved 미정산 건수
    const approvedSnapshot = await db.collection('requests').where('status', '==', 'approved').get()

    const totalApprovedUnsettledCount = approvedSnapshot.size

    const transporter = createTransporter()

    const recipients = [...recipientMap.entries()].map(([uid, role]) => ({ uid, role }))
    const recipientUserDocs = await Promise.all(recipients.map(r => db.doc(`users/${r.uid}`).get()))

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i]
      const role = r.role
      const userDoc = recipientUserDocs[i]
      const user = userDoc.data()
      const email = user?.email as string | undefined
      const name = ((user?.displayName || user?.name || '') as string)

      if (!email) continue

      const sections: { label: string; count: number }[] = []

      if (role === 'finance_ops') {
        // 운영위 재정: 운영위 검토 대상
        sections.push({ label: '운영위 검토 대기', count: opsPendingCount })
      } else if (role === 'finance_prep') {
        // 준비위 재정(총괄): 준비위 검토 대상 + 승인건 중 미정산
        sections.push({ label: '준비위 검토 대기', count: prepPendingCount })
        sections.push({ label: '승인 미정산', count: totalApprovedUnsettledCount })
      } else if (role === 'approver_ops') {
        // 운영위 승인자: 운영위 승인 대기
        sections.push({ label: '운영위 승인 대기', count: opsReviewedCount })
      } else if (role === 'approver_prep') {
        // 준비위 승인자: 준비위 승인 대기
        sections.push({ label: '준비위 승인 대기', count: prepReviewedCount })
      } else if (role === 'session_director') {
        // 운영 위원장: 운영위 승인 대기
        sections.push({ label: '운영위 승인 대기', count: opsReviewedCount })
      } else if (role === 'logistic_admin') {
        // 준비 위원장: 준비위 승인 대기
        sections.push({ label: '준비위 승인 대기', count: prepReviewedCount })
      } else if (role === 'executive' || role === 'admin') {
        // 대회장 / super_admin: 전체 승인 대기 + 미정산
        sections.push({ label: '승인 대기', count: totalReviewedCount })
        sections.push({ label: '승인 미정산', count: totalApprovedUnsettledCount })
      }

      const totalCount = sections.reduce((sum, s) => sum + s.count, 0)
      if (totalCount === 0) continue

      const { subject, html } = buildWeeklyDigestEmail(name, sections)

      try {
        await transporter.sendMail({
          from: `지불/환불 시스템 <${gmailUser.value()}>`,
          to: email,
          subject,
          html
        })
        console.log(`Weekly digest sent to ${email}: ${totalCount} items`)
      } catch (error) {
        console.error(`Failed to send weekly digest to ${email}:`, error)
      }
    }
  }
)

// --- Dashboard Stats ---
export const getDashboardStats = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  const { projectId } = request.data as { projectId: string }
  if (!projectId || typeof projectId !== 'string') {
    throw new HttpsError('invalid-argument', 'projectId is required')
  }

  const db = admin.firestore()
  const callerUid = request.auth.uid
  const [callerSnap, projSnap] = await Promise.all([
    db.doc(`users/${callerUid}`).get(),
    db.doc(`projects/${projectId}`).get()
  ])
  const callerSystemRole = getSystemRole(callerSnap.data())
  const isSuperAdmin = callerSystemRole === 'super_admin'
  const isMember = projSnap.data()?.memberRoles?.[callerUid] != null
  if (!isSuperAdmin && !isMember) {
    throw new HttpsError('permission-denied', 'Not a member of this project')
  }

  const projectData = projSnap.data() ?? {}
  const usdToKrwRate =
    (projectData.usdToKrwRate as number | undefined) ??
    (projectData.opsBudget?.usdToKrwRate as number | undefined) ?? 0

  const snap = await db
    .collection('requests')
    .where('projectId', '==', projectId)
    .select('status', 'totalAmount', 'totalAmountUsd', 'committee', 'items', 'date', 'createdAt')
    .get()

  let total = 0
  let pending = 0
  let reviewed = 0
  let approvedOnly = 0
  let settled = 0
  let rejected = 0
  let totalAmount = 0
  let approvedAmount = 0
  let approvedOnlyAmount = 0
  let settledAmount = 0
  let pendingAmount = 0
  let reviewedAmount = 0
  const byCommittee: Record<string, { count: number; amount: number; approvedAmount: number }> = {}
  const byBudgetCode: Record<number, { count: number; amount: number; approvedAmount: number }> = {}
  const monthlyTrend: Record<string, number> = {}
  const monthlyCount: Record<string, number> = {}
  const dailyTrend: Record<string, number> = {}
  const dailyCount: Record<string, number> = {}

  snap.forEach((doc) => {
    const d = doc.data()
    const status = d.status as string
    // When project.opsBudget.usdToKrwRate is set, USD items are converted to KRW and
    // included in all aggregations. When unset (or 0), USD items contribute 0.
    const amount = (d.totalAmount as number) || 0
    const amountUsd = (d.totalAmountUsd as number) || 0
    const effectiveAmount = amount + (usdToKrwRate > 0 ? Math.round(amountUsd * usdToKrwRate) : 0)
    const committee = (d.committee as string) || 'operations'
    const items = (d.items as { budgetCode: number; amount: number; currency?: string }[]) || []
    const date = (d.date as string) || ''

    total++
    totalAmount += effectiveAmount

    if (status === 'pending') { pending++; pendingAmount += effectiveAmount }
    else if (status === 'reviewed') { reviewed++; reviewedAmount += effectiveAmount }
    else if (status === 'approved') { approvedOnly++; approvedOnlyAmount += effectiveAmount }
    else if (status === 'settled') { settled++; settledAmount += effectiveAmount }
    else if (status === 'rejected' || status === 'force_rejected') { rejected++ }

    const isApproved = status === 'approved' || status === 'settled'
    approvedAmount = approvedOnlyAmount + settledAmount

    if (!byCommittee[committee]) byCommittee[committee] = { count: 0, amount: 0, approvedAmount: 0 }
    byCommittee[committee].count++
    byCommittee[committee].amount += effectiveAmount
    if (isApproved) byCommittee[committee].approvedAmount += effectiveAmount

    for (const item of items) {
      const code = item.budgetCode
      if (!byBudgetCode[code]) byBudgetCode[code] = { count: 0, amount: 0, approvedAmount: 0 }
      byBudgetCode[code].count++
      // When project.opsBudget.usdToKrwRate is set, USD items are converted to KRW and
      // included in all aggregations. When unset (or 0), USD items contribute 0.
      const itemCurrency = item.currency || 'KRW'
      const itemEffectiveKrw =
        itemCurrency === 'USD'
          ? (usdToKrwRate > 0 ? Math.round(item.amount * usdToKrwRate) : 0)
          : item.amount
      byBudgetCode[code].amount += itemEffectiveKrw
      if (isApproved) byBudgetCode[code].approvedAmount += itemEffectiveKrw
    }

    if (date) {
      const month = date.substring(0, 7)
      monthlyTrend[month] = (monthlyTrend[month] || 0) + effectiveAmount
      dailyTrend[date] = (dailyTrend[date] || 0) + effectiveAmount
      dailyCount[date] = (dailyCount[date] || 0) + 1
      monthlyCount[month] = (monthlyCount[month] || 0) + 1
    }
  })

  return {
    total,
    pending,
    reviewed,
    approvedOnly,
    settled,
    rejected,
    totalAmount,
    approvedAmount,
    approvedOnlyAmount,
    settledAmount,
    pendingAmount,
    reviewedAmount,
    byCommittee,
    byBudgetCode,
    monthlyTrend,
    monthlyCount,
    dailyTrend,
    dailyCount,
    usdToKrwRate
  }
})

export { onProjectMembersWrite } from './onProjectMembersWrite'

// --- AI Chatbot ---
import { handleChat } from './ai/chatHandler'

export const aiChat = onCall(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: [openaiApiKey, anthropicApiKey]
  },
  (request) =>
    handleChat(request, {
      openaiApiKey: openaiApiKey.value(),
      anthropicApiKey: anthropicApiKey.value()
    })
)
