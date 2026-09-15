import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { SQLite } from "@hocuspocus/extension-sqlite";
import postgres from "postgres";

const secret = process.env.HOCUSPOCUS_SECRET;
if (!secret) throw new Error("HOCUSPOCUS_SECRET is required");

const databaseUrl = process.env.DATABASE_URL;
let persistence;

if (databaseUrl) {
  const sql = postgres(databaseUrl, { ssl: "require", max: 5, prepare: false });
  await sql`CREATE TABLE IF NOT EXISTS hocuspocus_documents (
    name TEXT PRIMARY KEY,
    data BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  persistence = new Database({
    fetch: async ({ documentName }) => {
      const rows = await sql`SELECT data FROM hocuspocus_documents WHERE name = ${documentName}`;
      return rows[0]?.data ?? null;
    },
    store: async ({ documentName, state }) => {
      const bytes = Buffer.from(state);
      await sql`INSERT INTO hocuspocus_documents (name, data, updated_at)
        VALUES (${documentName}, ${bytes}, NOW())
        ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
    },
  });
} else {
  persistence = new SQLite({ database: process.env.SQLITE_PATH || "/data/loom-docs.sqlite" });
}

const server = new Server({
  port: Number(process.env.PORT || 1234),
  timeout: 30000,
  debounce: 1000,
  maxDebounce: 10000,
  extensions: [persistence],
  async onAuthenticate({ token }) {
    if (token !== secret) throw new Error("Not authorized");
  },
  async onConnect({ documentName }) {
    console.info(JSON.stringify({ event: "connect", documentName, at: new Date().toISOString() }));
  },
});

server.listen();
