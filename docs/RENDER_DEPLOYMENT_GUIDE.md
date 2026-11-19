# PsiGestor — Render Deployment, Security & Migration Architecture Guide

## 1. Environment & Service Topology

PsiGestor maintains three strictly isolated environments:

| Layer | Local Development | Staging (`develop`) | Production (`main`) |
|---|---|---|---|
| **Git Branch** | `feature/*` | `develop` (`autoDeploy: true`) | `main` (`autoDeploy: false`) |
| **PostgreSQL** | Local Docker `psigestor_db` | `psigestor-db-staging` (`psigestor_staging`) | `psigestor-db-prod` (`psigestor_prod`) |
| **Backend Flask API** | `http://localhost:5000` | `psigestor-api-staging` (`https://psigestor-api-staging.onrender.com`) | `psigestor-api` (`https://psigestor-api.onrender.com`) |
| **Frontend Angular 22 SSR** | `http://localhost:4200` | `psigestor-web-staging` (`https://psigestor-web-staging.onrender.com`) | `psigestor-web` (`https://psigestor-web.onrender.com`) |
| **Mobile App (Ionic/Capacitor)** | `environment.ts` (`http://localhost:5000`) | `environment.staging.ts` (`https://psigestor-api-staging.onrender.com`) | `environment.prod.ts` (`https://psigestor-api.onrender.com`) |

---

## 2. Render Plan Compatibility & Economic Impact (`plan: free` vs Paid Plans)

### 2.1 Default Configuration (`plan: free` — $0/month)
All services and databases in `render.yaml` are configured with `plan: free` by default so the project never incurs automatic charges.

**Important Technical Constraints of Render's Free Tier:**
1. **`preDeployCommand` and Render Web Shell Require Paid Plans:** Render's official specification restricts `preDeployCommand` and interactive SSH/Web Shell access to paid web service plans (`starter` at \$7/month per web service). Therefore, `render.yaml` does **not** depend on `preDeployCommand` in the free plan; migrations are executed via the **Controlled Manual Migration Workflow** (Section 3.2).
2. **PostgreSQL Free Tier Limit:** Render permits **1 free PostgreSQL database per account**, which expires 30 days after creation. To run both `psigestor-db-staging` and `psigestor-db-prod` simultaneously without paying, provision Staging and Production in separate Render accounts/workspaces, or upgrade Production to `basic-256mb` (\$6/month) only when formally authorized.
3. **Cold Starts on Free Web Services:** Free web services spin down after 15 minutes of inactivity and take ~30–50 seconds to wake up on the first request.

### 2.2 Optional Paid Plan Upgrade (Only if Explicitly Authorized)
If the team or institution later authorizes paid plans:
- **Backend Web Service (`plan: starter` — \$7/month):** Enables zero spin-down, interactive Render Shell, and `preDeployCommand: PYTHONPATH=backend python -m app.init_db --migrate-only`.
- **PostgreSQL (`plan: basic-256mb` — \$6/month):** Removes the 30-day expiration limit and provides automated daily backups.

---

## 3. Build, Start, Health Checks & Controlled Migration Workflow

### 3.1 Why Database Migrations Must NEVER Run in `buildCommand`
1. **Render Private Network Isolation During Build:** Render's internal database `connectionString` (`dpg-xxxx-a:5432`) resolves over the runtime private network, which is not reliably bound or guaranteed during the isolated build container stage.
2. **Separation of Artifact Compilation and State Mutation:** Rebuilding or caching an application image must never mutate a live database that is currently serving traffic for the previous release.
3. **Container Rollbacks Do Not Roll Back Database Changes:** Rolling back a deploy in Render only reverts the application container image; **it does NOT revert DDL (`ALTER TABLE`, `CREATE TABLE`) or data modifications already committed in PostgreSQL**.

### 3.2 Controlled Manual Migration Workflow (Compatible with `plan: free` and Paid Plans)
Instead of running migrations blindly inside every build or worker startup, migrations are executed as a dedicated, auditable operation from an authorized workstation (using the database's **External Database URL** with SSL from the Render Dashboard, or via Render Shell on paid plans):

1. **Step 1 — Read-Only Audit (`--verify-only`):**
   ```bash
   DATABASE_URL="<RENDER_EXTERNAL_DATABASE_URL>?sslmode=require" \
   APP_ENV=staging \
   PYTHONPATH=backend \
   python -m app.init_db --verify-only
   ```
   - Inspects `schema_migrations` in read-only mode.
   - Verifies that all previously applied migration files match their recorded SHA-256 checksums.
   - Lists any pending migration files without modifying the database.
2. **Step 2 — Controlled Schema Migration (`--migrate-only`):**
   ```bash
   DATABASE_URL="<RENDER_EXTERNAL_DATABASE_URL>?sslmode=require" \
   APP_ENV=staging \
   PYTHONPATH=backend \
   python -m app.init_db --migrate-only
   ```
   - Acquires PostgreSQL session advisory lock `pg_advisory_lock(7392045112840195)` so no two processes can run migrations concurrently.
   - Verifies all recorded SHA-256 checksums (halts immediately with `MigrationChecksumMismatchError` on mismatch).
   - Adopts preexisting complete schemas (verifying all tables, columns, constraints, constraint definitions, and indexes) or applies pending `.sql` migrations inside atomic transactions.
   - Optionally provisions the initial psychologist account if `INITIAL_PSYCHOLOGIST_EMAIL` and `INITIAL_PSYCHOLOGIST_PASSWORD` are set.
   - **Never loads demonstration/test seeds.**
3. **Step 3 — Post-Migration Read-Only Confirmation (`--verify-only`):**
   ```bash
   DATABASE_URL="<RENDER_EXTERNAL_DATABASE_URL>?sslmode=require" \
   APP_ENV=staging \
   PYTHONPATH=backend \
   python -m app.init_db --verify-only
   ```
   - Confirms 13/13 migrations applied, 0 pending, and all checksums valid (exit code `0`).

### 3.3 Backend & Frontend Commands in `render.yaml`
- **Backend (`psigestor-api-staging` & `psigestor-api`):**
  - `buildCommand`: `pip install --no-cache-dir -r requirements.txt`
  - `startCommand`: `SKIP_DB_INIT_ON_IMPORT=true gunicorn --chdir backend app.app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 60`
  - `healthCheckPath`: `/health`
- **Frontend SSR (`psigestor-web-staging` & `psigestor-web`):**
  - `rootDir`: `frontend`
  - `buildCommand` (Staging): `npm ci && npx ng build --configuration staging`
  - `buildCommand` (Production): `npm ci && npx ng build --configuration production`
  - `startCommand`: `node dist/PsiGestor/server/server.mjs`
  - `healthCheckPath`: `/login`

---

## 4. PostgreSQL Backup & Non-Destructive Recovery Protocol

> [!CAUTION]
> **Critical Warning Regarding `pg_restore --clean`:**
> Using `pg_restore --clean --if-exists` is a **destructive operation** that executes `DROP` on existing database tables and objects before recreating them.
> - **NEVER execute a destructive restore (`--clean`) directly against the active production database without explicit authorization and an approved recovery plan.**
> - **ALWAYS verify the backup archive first and restore into an independent target database before switching traffic.**

### 4.1 Mandatory Pre-Migration Backup & Verification
Before applying any schema migration to a database containing real data:

1. **Create a Logical Backup Archive (`pg_dump` custom format):**
   ```bash
   pg_dump "<RENDER_EXTERNAL_DATABASE_URL>?sslmode=require" \
     --format=custom \
     --no-owner \
     --no-privileges \
     --file="backup_psigestor_$(date +%Y%m%d_%H%M%S).dump"
   ```
2. **Verify Backup Integrity and Table Catalog (`pg_restore --list`):**
   ```bash
   pg_restore --list "backup_psigestor_YYYYMMDD_HHMMSS.dump"
   ```
   Confirm the archive is readable and lists all expected tables (`users`, `students`, `availabilities`, `appointments`, `regular_schedule`, `regular_schedule_days`, `disabled_schedules`, `auth_refresh_tokens`, `auth_rate_limits`, `schema_migrations`).

### 4.2 Recommended Non-Destructive Recovery (Restore to an Independent Database First)
If a migration or operational incident requires restoring from backup:

1. **Provision or select an independent recovery PostgreSQL database (`RECOVERY_DATABASE_URL`).**
    Do **not** overwrite the live production database in place.
2. **Restore the verified backup into the independent database (without `--clean`):**
   ```bash
   pg_restore \
     --no-owner \
     --no-privileges \
     --exit-on-error \
     --dbname="<RECOVERY_DATABASE_URL>?sslmode=require" \
     "backup_psigestor_YYYYMMDD_HHMMSS.dump"
   ```
3. **Audit the Restored Database:**
   - Run `PYTHONPATH=backend DATABASE_URL="<RECOVERY_DATABASE_URL>?sslmode=require" python -m app.init_db --verify-only`.
   - Verify row counts and data integrity on the isolated recovery instance.
4. **Cutover Traffic (Blue/Green Switch):**
   - Once verified and explicitly authorized, update `DATABASE_URL` on the backend service to point to the validated recovery database and deploy the matching application revision.

---

## 5. Required Environment Variables (Without Secret Values)

### 5.1 Backend Services (`psigestor-api-staging` / `psigestor-api`)

| Variable | Staging | Production | Source / Notes |
|---|---|---|---|
| `APP_ENV` | `staging` | `production` | Controls strict security, seeding rules, and error sanitization |
| `FLASK_DEBUG` | `false` | `false` | Debugger strictly disabled |
| `DATABASE_URL` | Internal Render DB URL | Internal Render DB URL | Injected from `psigestor-db-staging` / `psigestor-db-prod` |
| `SECRET_KEY` | Random >= 32 chars | Random >= 32 chars | Distinct per environment; signs Web `HttpOnly` session cookies |
| `MOBILE_TOKEN_SECRET` | Random >= 32 chars | Random >= 32 chars | **Must be distinct from `SECRET_KEY`**; signs 15-min mobile access tokens |
| `STRICT_AUTH` | `true` | `true` | Enforces authentication on all protected endpoints |
| `ENFORCE_CSRF_TOKEN` | `true` | `true` | Enforces `Origin`/`Referer` + `X-CSRF-Token` on cookie-authenticated mutations |
| `RATE_LIMIT_STORAGE` | `database` | `database` | Uses shared PostgreSQL table `auth_rate_limits` across Gunicorn workers |
| `SESSION_COOKIE_SAMESITE` | `Lax` | `Lax` | First-party `HttpOnly` cookie via SSR reverse proxy |
| `SESSION_COOKIE_SECURE` | `true` | `true` | Enforces HTTPS-only cookies |
| `CORS_ALLOWED_ORIGINS` | `https://psigestor-web-staging.onrender.com,capacitor://localhost,http://localhost,https://localhost` | `https://psigestor-web.onrender.com,capacitor://localhost,http://localhost,https://localhost` | Configured manually in Render Dashboard (`sync: false`) |
| `ALLOW_STAGING_SEEDS` | `false` (or `true` if demo data desired) | `false` (ignored in prod) | Production never loads test seeds even if set to `true` |
| `INITIAL_PSYCHOLOGIST_EMAIL` | Institutional email | Institutional email | Configured in Render Dashboard (`sync: false`) |
| `INITIAL_PSYCHOLOGIST_PASSWORD` | Strong password (>= 10 chars) | Strong password (>= 10 chars) | Configured in Render Dashboard (`sync: false`); demo passwords rejected |

### 5.2 Frontend SSR Services (`psigestor-web-staging` / `psigestor-web`)

| Variable | Staging | Production | Notes |
|---|---|---|---|
| `NODE_ENV` | `production` | `production` | Production Express runtime |
| `BACKEND_URL` | `https://psigestor-api-staging.onrender.com` | `https://psigestor-api.onrender.com` | Pinned upstream origin for `/backend-api/*` SSR proxy |
| `ALLOWED_HOSTS` | `psigestor-web-staging.onrender.com,*.onrender.com,localhost,127.0.0.1` | `psigestor-web.onrender.com,*.onrender.com,localhost,127.0.0.1` | SSR host header allowlist |
