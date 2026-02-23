import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();

const gmailEmail = defineSecret("GMAIL_EMAIL");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

const RATE_LIMIT_COLLECTION = "email_rate_limits";
const MAX_PER_DAY = 2;
const COOLDOWN_MS = 60 * 1000; // 1 minute

async function checkRateLimit(ip: string): Promise<void> {
  const db = admin.firestore();
  const docRef = db.collection(RATE_LIMIT_COLLECTION).doc(ip);
  const doc = await docRef.get();

  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (doc.exists) {
    const data = doc.data()!;
    const lastSent = (data.lastSentAt as admin.firestore.Timestamp).toMillis();
    const dailyCount = data.dailyCount as number || 0;
    const dailyResetAt = (data.dailyResetAt as admin.firestore.Timestamp).toMillis();

    // Reset daily count if new day
    const isNewDay = dailyResetAt < todayStart.getTime();
    const currentCount = isNewDay ? 0 : dailyCount;

    // Check cooldown (1 minute)
    if (now - lastSent < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (now - lastSent)) / 1000);
      throw new HttpsError(
        "resource-exhausted",
        `Please wait ${waitSec} seconds before requesting again.`
      );
    }

    // Check daily limit
    if (currentCount >= MAX_PER_DAY) {
      throw new HttpsError(
        "resource-exhausted",
        "Daily email limit reached. Please try again tomorrow."
      );
    }

    // Update
    await docRef.update({
      lastSentAt: admin.firestore.Timestamp.now(),
      dailyCount: currentCount + 1,
      dailyResetAt: isNewDay
        ? admin.firestore.Timestamp.fromDate(todayStart)
        : data.dailyResetAt,
    });
  } else {
    // First request from this IP
    await docRef.set({
      lastSentAt: admin.firestore.Timestamp.now(),
      dailyCount: 1,
      dailyResetAt: admin.firestore.Timestamp.fromDate(todayStart),
    });
  }
}

export const sendPersonalCode = onCall(
  { secrets: [gmailEmail, gmailAppPassword] },
  async (request) => {
    const { email, surveyId } = request.data as {
      email?: string;
      surveyId?: string;
    };

    if (!email || !surveyId) {
      throw new HttpsError("invalid-argument", "email and surveyId are required");
    }

    // Rate limit by IP
    const ip = request.rawRequest.ip || "unknown";
    await checkRateLimit(ip);

    // Look up response
    const snapshot = await admin
      .firestore()
      .collection("survey_responses")
      .where("surveyId", "==", surveyId)
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new HttpsError("not-found", "No registration found");
    }

    const personalCode = snapshot.docs[0].data().personalCode as string;

    // Look up survey title
    const surveySnap = await admin
      .firestore()
      .collection("surveys")
      .doc(surveyId)
      .get();
    const surveyTitle = surveySnap.exists
      ? (surveySnap.data()?.title as string) || "Registration"
      : "Registration";

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailEmail.value(),
        pass: gmailAppPassword.value(),
      },
    });

    await transporter.sendMail({
      from: `"${surveyTitle}" <${gmailEmail.value()}>`,
      to: email,
      subject: `Your Personal Code - ${surveyTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #111; margin-bottom: 8px;">${surveyTitle}</h2>
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Your personal code is below. Use it to view or edit your registration.</p>
          <div style="background: #f0f4ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <p style="color: #1e40af; font-size: 13px; margin: 0 0 8px;">Personal Code</p>
            <p style="font-size: 32px; font-weight: bold; font-family: monospace; letter-spacing: 4px; color: #111; margin: 0;">${personalCode}</p>
          </div>
          <p style="color: #999; font-size: 12px;">This is an automated message. Please do not reply.</p>
        </div>
      `,
    });

    return { success: true };
  }
);
