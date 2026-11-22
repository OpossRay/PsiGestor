import os
import sys
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch
import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
RENDER_YAML_PATH = REPO_ROOT / "render.yaml"
RENDER_PROD_YAML_PATH = REPO_ROOT / "render.production.yaml"
BACKEND_DOCKERFILE_PATH = BACKEND_DIR / "Dockerfile"
BACKEND_DOCKERIGNORE_PATH = BACKEND_DIR / ".dockerignore"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ["SKIP_DB_INIT_ON_IMPORT"] = "true"

from app.init_db import (
    MigrationChecksumMismatchError,
    MigrationError,
    compute_migration_checksum,
    init_database,
    seed_academic_demo,
    should_load_demo_seeds,
    verify_migrations_state,
)


class TestPhase4RenderBlueprintAndDockerConfig(unittest.TestCase):
    def setUp(self):
        self.assertTrue(RENDER_YAML_PATH.exists(), "render.yaml must exist at repository root")
        self.assertTrue(RENDER_PROD_YAML_PATH.exists(), "render.production.yaml must exist at repository root")
        self.blueprint_free = yaml.safe_load(RENDER_YAML_PATH.read_text(encoding="utf-8"))
        self.blueprint_prod = yaml.safe_load(RENDER_PROD_YAML_PATH.read_text(encoding="utf-8"))

    def test_etapa_a_blueprint_contains_only_single_free_database_and_staging_services(self):
        dbs = {db["name"]: db for db in self.blueprint_free.get("databases", [])}
        self.assertEqual(len(dbs), 1, "Etapa A (render.yaml) must contain exactly one database to respect Render Free limits")
        self.assertIn("psigestor-db-staging", dbs)
        self.assertEqual(dbs["psigestor-db-staging"]["plan"], "free")

        services = {svc["name"]: svc for svc in self.blueprint_free.get("services", [])}
        self.assertEqual(len(services), 2, "Etapa A must contain only the 2 staging services")
        self.assertIn("psigestor-api-staging", services)
        self.assertIn("psigestor-web-staging", services)
        self.assertEqual(services["psigestor-api-staging"]["branch"], "develop")
        self.assertEqual(services["psigestor-api-staging"]["plan"], "free")
        self.assertEqual(services["psigestor-api-staging"]["healthCheckPath"], "/health")
        self.assertEqual(services["psigestor-web-staging"]["branch"], "develop")
        self.assertEqual(services["psigestor-web-staging"]["plan"], "free")
        self.assertEqual(services["psigestor-web-staging"]["healthCheckPath"], "/login")

        # Verify database link and backend URL
        api_env = {e["key"]: e for e in services["psigestor-api-staging"]["envVars"]}
        self.assertEqual(api_env["DATABASE_URL"]["fromDatabase"]["name"], "psigestor-db-staging")
        web_env = {e["key"]: e for e in services["psigestor-web-staging"]["envVars"]}
        self.assertEqual(web_env["BACKEND_URL"]["value"], "https://psigestor-api-staging.onrender.com")

    def test_etapa_b_blueprint_defines_persistent_staging_and_production(self):
        dbs = {db["name"]: db for db in self.blueprint_prod.get("databases", [])}
        self.assertEqual(len(dbs), 2)
        self.assertIn("psigestor-db-staging", dbs)
        self.assertIn("psigestor-db-prod", dbs)
        self.assertNotEqual(
            dbs["psigestor-db-staging"]["databaseName"],
            dbs["psigestor-db-prod"]["databaseName"],
        )
        self.assertEqual(dbs["psigestor-db-staging"]["plan"], "basic-256mb")
        self.assertEqual(dbs["psigestor-db-prod"]["plan"], "basic-256mb")

        services = {svc["name"]: svc for svc in self.blueprint_prod.get("services", [])}
        self.assertIn("psigestor-api-staging", services)
        self.assertIn("psigestor-web-staging", services)
        self.assertIn("psigestor-api", services)
        self.assertIn("psigestor-web", services)

        # Staging tracks develop
        self.assertEqual(services["psigestor-api-staging"]["branch"], "develop")
        self.assertEqual(services["psigestor-web-staging"]["branch"], "develop")
        self.assertEqual(services["psigestor-api-staging"]["plan"], "starter")
        api_stg_env = {e["key"]: e for e in services["psigestor-api-staging"]["envVars"]}
        self.assertEqual(api_stg_env["DATABASE_URL"]["fromDatabase"]["name"], "psigestor-db-staging")

        # Production tracks main exclusively and disables autoDeploy for manual approval gate
        self.assertEqual(services["psigestor-api"]["branch"], "main")
        self.assertFalse(services["psigestor-api"]["autoDeploy"])
        self.assertEqual(services["psigestor-web"]["branch"], "main")
        self.assertFalse(services["psigestor-web"]["autoDeploy"])
        self.assertEqual(services["psigestor-api"]["plan"], "starter")
        self.assertEqual(services["psigestor-web"]["plan"], "starter")
        self.assertEqual(services["psigestor-api"]["healthCheckPath"], "/health")
        self.assertEqual(services["psigestor-web"]["healthCheckPath"], "/login")
        api_prod_env = {e["key"]: e for e in services["psigestor-api"]["envVars"]}
        self.assertEqual(api_prod_env["DATABASE_URL"]["fromDatabase"]["name"], "psigestor-db-prod")

    def test_build_command_is_decoupled_from_database_migrations_in_both_blueprints(self):
        for blueprint in (self.blueprint_free, self.blueprint_prod):
            services = {svc["name"]: svc for svc in blueprint.get("services", [])}
            for svc_name, svc in services.items():
                if svc["runtime"] == "python":
                    self.assertNotIn("init_db", svc.get("buildCommand", ""))
                    self.assertNotIn("init_db", svc.get("startCommand", ""))

    def test_backend_dockerfile_and_dockerignore_safety(self):
        content = BACKEND_DOCKERFILE_PATH.read_text(encoding="utf-8")
        self.assertIn("COPY database /database", content)
        self.assertIn("SKIP_DB_INIT_ON_IMPORT=true", content)
        self.assertIn("exec gunicorn app.app:app", content)

        self.assertTrue(BACKEND_DOCKERIGNORE_PATH.exists())
        ignore_content = BACKEND_DOCKERIGNORE_PATH.read_text(encoding="utf-8")
        self.assertIn(".env", ignore_content)
        self.assertIn(".venv/", ignore_content)

    def test_legacy_demo_seeds_are_strictly_blocked_in_staging_production_and_render(self):
        with patch.dict(os.environ, {"APP_ENV": "production"}):
            self.assertFalse(should_load_demo_seeds())

        with patch.dict(os.environ, {"APP_ENV": "staging", "ALLOW_STAGING_SEEDS": "true"}):
            self.assertFalse(should_load_demo_seeds(), "Legacy seeds containing real names/passwords must be blocked in staging")

        with patch.dict(os.environ, {"APP_ENV": "development", "RENDER": "true"}):
            self.assertFalse(should_load_demo_seeds(), "Legacy seeds must be blocked when running in Render cloud")

    @patch("app.init_db.sync_regular_schedule_availabilities")
    def test_seed_academic_demo_strictly_rejects_production_environment(self, mock_sync):
        mock_conn = MagicMock()
        with patch.dict(os.environ, {"APP_ENV": "production"}):
            with self.assertRaises(MigrationError) as ctx:
                seed_academic_demo(mock_conn)
            self.assertIn("producción", str(ctx.exception).lower())

    def test_seed_academic_demo_strictly_rejects_forbidden_and_weak_passwords(self):
        mock_conn = MagicMock()
        invalid_cases = [
            ("password123", "SecureStudentPass2026!"),
            ("SecurePsychPass2026!", "password123"),
            ("short", "SecureStudentPass2026!"),
            ("", "SecureStudentPass2026!"),
        ]
        for psych_pass, student_pass in invalid_cases:
            with patch.dict(os.environ, {
                "APP_ENV": "staging",
                "INITIAL_PSYCHOLOGIST_PASSWORD": psych_pass,
                "DEMO_STUDENT_PASSWORD": student_pass,
            }):
                with self.assertRaises(MigrationError):
                    seed_academic_demo(mock_conn)

    @patch("app.init_db.sync_regular_schedule_availabilities")
    def test_seed_academic_demo_populates_only_fictitious_records_idempotently(self, mock_sync):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_cursor.fetchone.side_effect = [None, (1,)]

        with patch.dict(os.environ, {
            "APP_ENV": "staging",
            "INITIAL_PSYCHOLOGIST_PASSWORD": "StrongPsychPassword2026!",
            "DEMO_STUDENT_PASSWORD": "StrongStudentPassword2026!",
        }):
            res = seed_academic_demo(mock_conn)
            self.assertEqual(res["status"], "seeded_academic_demo")
            self.assertEqual(res["students"], 3)
            self.assertEqual(res["users"], 4)

            # Ensure all executed statements use ON CONFLICT DO NOTHING (idempotent, no deletions)
            all_executes = [call[0][0] for call in mock_cursor.execute.call_args_list]
            for sql in all_executes:
                self.assertNotIn("DELETE", sql)
                self.assertNotIn("TRUNCATE", sql)
                self.assertNotIn("DROP", sql)

    @patch("app.init_db.sync_regular_schedule_availabilities")
    def test_seed_academic_demo_two_consecutive_runs_are_strictly_idempotent(self, mock_sync):
        db_state = {
            "students": {},
            "users": {},
            "regular_schedule": [],
        }

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        def fake_execute(query, params=None):
            q = query.strip()
            if "SELECT id FROM regular_schedule LIMIT 1;" in q:
                if db_state["regular_schedule"]:
                    mock_cursor.fetchone.return_value = (db_state["regular_schedule"][0]["id"],)
                else:
                    mock_cursor.fetchone.return_value = None
            elif "INSERT INTO regular_schedule (" in q:
                sched_id = len(db_state["regular_schedule"]) + 1
                db_state["regular_schedule"].append({"id": sched_id})
                mock_cursor.fetchone.return_value = (sched_id,)
            elif "INSERT INTO students" in q:
                sid, name, prog, sem = params
                if sid not in db_state["students"]:
                    db_state["students"][sid] = {"name": name, "prog": prog, "sem": sem}
            elif "INSERT INTO users" in q:
                email = params[0]
                if email not in db_state["users"]:
                    db_state["users"][email] = params

        mock_cursor.execute.side_effect = fake_execute

        env = {
            "APP_ENV": "staging",
            "INITIAL_PSYCHOLOGIST_PASSWORD": "StrongPsychPassword2026!",
            "DEMO_STUDENT_PASSWORD": "StrongStudentPassword2026!",
        }
        with patch.dict(os.environ, env):
            # Run 1: Inserts records
            res1 = seed_academic_demo(mock_conn)
            self.assertEqual(res1["status"], "seeded_academic_demo")
            self.assertEqual(len(db_state["students"]), 3)
            self.assertEqual(len(db_state["users"]), 4)
            self.assertEqual(len(db_state["regular_schedule"]), 1)

            # Run 2: Consecutive execution must not duplicate or alter records
            res2 = seed_academic_demo(mock_conn)
            self.assertEqual(res2["status"], "seeded_academic_demo")
            self.assertEqual(len(db_state["students"]), 3)
            self.assertEqual(len(db_state["users"]), 4)
            self.assertEqual(len(db_state["regular_schedule"]), 1)

    @patch("app.init_db.run_seeds")
    @patch("app.init_db.run_migrations", return_value=["applied:012_create_auth_refresh_tokens.sql"])
    @patch("app.init_db.connect_with_retry")
    def test_migrate_only_mode_runs_migrations_with_advisory_lock_and_skips_demo_seeds(
        self, mock_connect, mock_run_migrations, mock_run_seeds
    ):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (1,)
        mock_connect.return_value = mock_conn

        result = init_database(reset=False, migrate_only=True)
        self.assertEqual(result["status"], "migrated")
        mock_run_migrations.assert_called_once()
        mock_run_seeds.assert_not_called()

    @patch("app.init_db.connect_with_retry")
    def test_verify_only_mode_is_read_only_and_detects_pending_or_valid_migrations(
        self, mock_connect
    ):
        migrations_dir = REPO_ROOT / "database" / "migrations"
        all_files = sorted(migrations_dir.glob("*.sql"))

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        # Case 1: 1 migration is still pending -> verify_only raises MigrationError
        mock_cursor.fetchone.return_value = (True,)
        mock_cursor.fetchall.return_value = [
            (f.name, compute_migration_checksum(f.read_text(encoding="utf-8")))
            for f in all_files[:-1]
        ]
        with self.assertRaises(MigrationError):
            init_database(verify_only=True)

        # Case 2: All 13 migrations applied with matching checksums -> verify_only succeeds
        mock_cursor.fetchone.return_value = (True,)
        mock_cursor.fetchall.return_value = [
            (f.name, compute_migration_checksum(f.read_text(encoding="utf-8")))
            for f in all_files
        ]
        result = init_database(verify_only=True)
        self.assertEqual(result["status"], "verified")
        self.assertEqual(len(result["applied"]), 14)
        self.assertEqual(result["pending"], [])


if __name__ == "__main__":
    unittest.main()
