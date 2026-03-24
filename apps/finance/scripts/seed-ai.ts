/**
 * AI Chatbot Firestore Seed Script
 * Usage: npm run seed:ai (emulator) or npx tsx scripts/seed-ai.ts --prod (production)
 *
 * Seeds ai-settings for the AI chatbot feature.
 * Context documents are managed as .md files in functions/src/ai/context/
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const isProd = process.argv.includes("--prod");

if (!isProd) {
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
  initializeApp({ projectId: "finance-96f46" });
  console.log("🔧 Connected to Firestore EMULATOR (localhost:8080)");
} else {
  initializeApp({ projectId: "finance-96f46" });
  console.log("🚀 Connected to PRODUCTION Firestore");
}

const db = getFirestore();

const aiSettings = {
  provider: "openai" as const,
  model: "gpt-4o-mini",
  temperature: 0.1,
  topP: 0.9,
  maxTokens: 1024,
  enabled: true,
  refusalMessage:
    "죄송합니다, 저는 경비 정산 앱 사용법과 규정에 대해서만 안내할 수 있습니다. 다른 질문이 있으시면 관리자에게 문의해주세요.",
};

async function seed() {
  console.log("\n📝 Seeding AI settings...");
  await db.collection("ai-settings").doc("config").set(aiSettings);
  console.log("   ✅ ai-settings/config created");

  console.log("\nSettings:");
  console.log(`   Provider: ${aiSettings.provider}`);
  console.log(`   Model: ${aiSettings.model}`);
  console.log(`   Temperature: ${aiSettings.temperature}`);
  console.log(`   Enabled: ${aiSettings.enabled}`);
  console.log(
    "\n📄 Context documents are managed as .md files in functions/src/ai/context/"
  );
  console.log("\n🎉 Done!\n");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
