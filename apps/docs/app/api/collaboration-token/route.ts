import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const token = (env as unknown as { COLLAB_TOKEN?: string }).COLLAB_TOKEN;
  if (!token) return Response.json({ error: "Collaboration is not configured" }, { status: 503 });
  return Response.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
