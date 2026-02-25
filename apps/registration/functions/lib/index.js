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
exports.submitRegistration = exports.findCodeByEmail = exports.lookupByCode = exports.sendPersonalCode = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const crypto = __importStar(require("crypto"));
admin.initializeApp();
const db = admin.firestore();
const gmailEmail = (0, params_1.defineSecret)("GMAIL_EMAIL");
const gmailAppPassword = (0, params_1.defineSecret)("GMAIL_APP_PASSWORD");
// ─── Helpers ──────────────────────────────────────────────────────
function sanitizeForEmail(str) {
    return str.replace(/[\r\n"<>]/g, "").trim().substring(0, 100);
}
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function requireIp(request) {
    const ip = request.rawRequest.ip;
    if (!ip) {
        throw new https_1.HttpsError("internal", "Unable to determine request origin.");
    }
    return ip;
}
function generatePersonalCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(8);
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
function generateSearchKeys(name, email) {
    const keys = [];
    const normalized = name.toLowerCase().trim();
    for (let i = 1; i <= normalized.length; i++) {
        keys.push(normalized.substring(0, i));
    }
    if (email) {
        const emailLower = email.toLowerCase().trim();
        for (let i = 1; i <= emailLower.length; i++) {
            keys.push(emailLower.substring(0, i));
        }
    }
    return keys;
}
// ─── Rate Limiting ────────────────────────────────────────────────
const RATE_LIMIT_COLLECTION = "rate_limits";
async function checkRateLimit(ip, config) {
    const docRef = db
        .collection(RATE_LIMIT_COLLECTION)
        .doc(`${config.prefix}_${ip}`);
    const doc = await docRef.get();
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (doc.exists) {
        const data = doc.data();
        const lastSent = data.lastSentAt.toMillis();
        const dailyCount = data.dailyCount || 0;
        const dailyResetAt = data.dailyResetAt.toMillis();
        const isNewDay = dailyResetAt < todayStart.getTime();
        const currentCount = isNewDay ? 0 : dailyCount;
        if (now - lastSent < config.cooldownMs) {
            const waitSec = Math.ceil((config.cooldownMs - (now - lastSent)) / 1000);
            throw new https_1.HttpsError("resource-exhausted", `Please wait ${waitSec} seconds before requesting again.`);
        }
        if (currentCount >= config.maxPerDay) {
            throw new https_1.HttpsError("resource-exhausted", "Daily limit reached. Please try again tomorrow.");
        }
        await docRef.update({
            lastSentAt: admin.firestore.Timestamp.now(),
            dailyCount: currentCount + 1,
            dailyResetAt: isNewDay
                ? admin.firestore.Timestamp.fromDate(todayStart)
                : data.dailyResetAt,
        });
    }
    else {
        await docRef.set({
            lastSentAt: admin.firestore.Timestamp.now(),
            dailyCount: 1,
            dailyResetAt: admin.firestore.Timestamp.fromDate(todayStart),
        });
    }
}
const EMAIL_RATE = { prefix: "email", maxPerDay: 2, cooldownMs: 60000 };
const LOOKUP_RATE = { prefix: "lookup", maxPerDay: 30, cooldownMs: 3000 };
const SUBMIT_RATE = { prefix: "submit", maxPerDay: 10, cooldownMs: 10000 };
// ─── sendPersonalCode ─────────────────────────────────────────────
exports.sendPersonalCode = (0, https_1.onCall)({ secrets: [gmailEmail, gmailAppPassword] }, async (request) => {
    const { email, surveyId } = request.data;
    if (!email || !surveyId) {
        throw new https_1.HttpsError("invalid-argument", "email and surveyId are required");
    }
    const ip = requireIp(request);
    await checkRateLimit(ip, EMAIL_RATE);
    const snapshot = await db
        .collection("survey_responses")
        .where("surveyId", "==", surveyId)
        .where("email", "==", email.toLowerCase().trim())
        .limit(1)
        .get();
    if (snapshot.empty) {
        throw new https_1.HttpsError("not-found", "No registration found");
    }
    const personalCode = snapshot.docs[0].data().personalCode;
    const surveySnap = await db.collection("surveys").doc(surveyId).get();
    const rawTitle = surveySnap.exists
        ? surveySnap.data()?.title || "Registration"
        : "Registration";
    const safeTitle = sanitizeForEmail(rawTitle);
    const htmlTitle = escapeHtml(rawTitle);
    const htmlCode = escapeHtml(personalCode);
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: gmailEmail.value(),
            pass: gmailAppPassword.value(),
        },
    });
    await transporter.sendMail({
        from: `"${safeTitle}" <${gmailEmail.value()}>`,
        to: email,
        subject: `Your Personal Code - ${safeTitle}`,
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #111; margin-bottom: 8px;">${htmlTitle}</h2>
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Your personal code is below. Use it to view or edit your registration.</p>
          <div style="background: #f0f4ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <p style="color: #1e40af; font-size: 13px; margin: 0 0 8px;">Personal Code</p>
            <p style="font-size: 32px; font-weight: bold; font-family: monospace; letter-spacing: 4px; color: #111; margin: 0;">${htmlCode}</p>
          </div>
          <p style="color: #999; font-size: 12px;">This is an automated message. Please do not reply.</p>
        </div>
      `,
    });
    return { success: true };
});
// ─── lookupByCode (#16: rate-limited code lookup) ─────────────────
exports.lookupByCode = (0, https_1.onCall)(async (request) => {
    const { code } = request.data;
    if (!code || code.length !== 8) {
        throw new https_1.HttpsError("invalid-argument", "Valid 8-character code required");
    }
    const ip = requireIp(request);
    await checkRateLimit(ip, LOOKUP_RATE);
    const snapshot = await db
        .collection("survey_responses")
        .where("personalCode", "==", code.toUpperCase().trim())
        .limit(1)
        .get();
    if (snapshot.empty) {
        throw new https_1.HttpsError("not-found", "Code not found");
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    // Return minimal data needed to navigate to the edit page
    return {
        responseId: doc.id,
        surveyId: data.surveyId,
        personalCode: data.personalCode,
    };
});
// ─── findCodeByEmail (#13: no PII leak, just sends email) ─────────
exports.findCodeByEmail = (0, https_1.onCall)({ secrets: [gmailEmail, gmailAppPassword] }, async (request) => {
    const { email } = request.data;
    if (!email) {
        throw new https_1.HttpsError("invalid-argument", "email is required");
    }
    const ip = requireIp(request);
    await checkRateLimit(ip, EMAIL_RATE);
    // Find across all surveys
    const snapshot = await db
        .collection("survey_responses")
        .where("email", "==", email.toLowerCase().trim())
        .limit(1)
        .get();
    if (snapshot.empty) {
        // Return success even if not found — don't leak whether email exists
        return { success: true };
    }
    const responseData = snapshot.docs[0].data();
    const personalCode = responseData.personalCode;
    const surveyId = responseData.surveyId;
    const surveySnap = await db.collection("surveys").doc(surveyId).get();
    const rawTitle = surveySnap.exists
        ? surveySnap.data()?.title || "Registration"
        : "Registration";
    const safeTitle = sanitizeForEmail(rawTitle);
    const htmlTitle = escapeHtml(rawTitle);
    const htmlCode = escapeHtml(personalCode);
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: gmailEmail.value(),
            pass: gmailAppPassword.value(),
        },
    });
    await transporter.sendMail({
        from: `"${safeTitle}" <${gmailEmail.value()}>`,
        to: email,
        subject: `Your Personal Code - ${safeTitle}`,
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #111; margin-bottom: 8px;">${htmlTitle}</h2>
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Your personal code is below. Use it to view or edit your registration.</p>
          <div style="background: #f0f4ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <p style="color: #1e40af; font-size: 13px; margin: 0 0 8px;">Personal Code</p>
            <p style="font-size: 32px; font-weight: bold; font-family: monospace; letter-spacing: 4px; color: #111; margin: 0;">${htmlCode}</p>
          </div>
          <p style="color: #999; font-size: 12px;">This is an automated message. Please do not reply.</p>
        </div>
      `,
    });
    return { success: true };
});
// ─── submitRegistration (#10: rate-limited registration) ──────────
const KNOWN_PARTICIPANT_FIELDS = [
    "name",
    "email",
    "phoneNumber",
    "gender",
    "age",
    "stake",
    "ward",
];
exports.submitRegistration = (0, https_1.onCall)(async (request) => {
    const { surveyId, data, participantData } = request.data;
    if (!surveyId || !data || !participantData) {
        throw new https_1.HttpsError("invalid-argument", "surveyId, data, and participantData are required");
    }
    // Verify survey exists and is active
    const surveySnap = await db.collection("surveys").doc(surveyId).get();
    if (!surveySnap.exists || !surveySnap.data()?.isActive) {
        throw new https_1.HttpsError("not-found", "Survey not found or inactive");
    }
    const ip = requireIp(request);
    await checkRateLimit(ip, SUBMIT_RATE);
    const personalCode = generatePersonalCode();
    const now = admin.firestore.Timestamp.now();
    const name = participantData.name || "";
    const email = participantData.email || "";
    const metadata = {
        registrationSurveyId: surveyId,
        personalCode,
    };
    for (const [key, value] of Object.entries(participantData)) {
        if (!KNOWN_PARTICIPANT_FIELDS.includes(key) &&
            value) {
            metadata[key] = value;
        }
    }
    const batch = db.batch();
    const participantRef = db.collection("participants").doc();
    batch.set(participantRef, {
        name,
        email,
        phoneNumber: participantData.phoneNumber || "",
        gender: participantData.gender || "",
        age: participantData.age || "",
        stake: participantData.stake || "",
        ward: participantData.ward || "",
        groupId: "",
        groupName: "",
        roomId: "",
        roomNumber: "",
        checkIns: [],
        createdAt: now,
        updatedAt: now,
        searchKeys: generateSearchKeys(name, email),
        metadata,
    });
    const responseRef = db.collection("survey_responses").doc();
    batch.set(responseRef, {
        surveyId,
        personalCode,
        participantId: participantRef.id,
        email,
        data,
        createdAt: now,
        updatedAt: now,
    });
    await batch.commit();
    return {
        personalCode,
        responseId: responseRef.id,
    };
});
//# sourceMappingURL=index.js.map