# Oracle Cloud collaboration server

This directory runs the MIT-licensed Hocuspocus server on an Oracle Cloud Ampere A1 VM. Caddy terminates TLS and proxies `wss://` traffic. Set `DATABASE_URL` to a Supabase Session Pooler connection string to persist Yjs binary state in PostgreSQL; leave it empty to use the SQLite named volume.

## VM setup

1. Create an Ubuntu ARM64 Ampere A1 instance and allow inbound TCP 80/443 in both the OCI security list and the VM firewall.
2. Point a DNS A record such as `collab.example.com` at the VM public IP.
3. Install Docker Engine with the Compose plugin, then copy this directory to the VM.
4. Copy `.env.example` to `.env`, set the domain, and generate a secret with `openssl rand -hex 32`.
5. For Supabase, copy the Session Pooler connection string into `DATABASE_URL`; the server creates its `hocuspocus_documents` table automatically.
6. Run `docker compose up -d --build`.
7. If SQLite is used, back up the `hocuspocus_data` volume regularly. On Supabase Free, create your own periodic export because automatic backups are not included.

Set the web app's `NEXT_PUBLIC_HOCUSPOCUS_URL` to `wss://collab.example.com` and set its server-only `COLLAB_TOKEN` to the same secret.
