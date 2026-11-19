import os
import sys
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch
import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
RENDER_YAML_PATH = REPO_ROOT / "render.yaml"
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
    verify_migrations_state,
)


class TestPhase4RenderBlueprintAndDockerConfig(unittest.TestCase):
    def setUp(self):
        self.assertTrue(RENDER_YAML_PATH.exists(), "render.yaml must exist at repository root")
        self.blueprint = yaml.safe_load(RENDER_YAML_PATH.read_text(encoding="utf-8"))

    def test_databases_are_strictly_separated_between_staging_and_production(self):
        dbs = {db["name"]: db for db in self.blueprint.get("databases", [])}
        self.assertIn("psigestor-db-staging", dbs)
        self.assertIn("psigestor-db-prod", dbs)
        self.assertNotEqual(
            dbs["psigestor-db-staging"]["databaseName"],
            dbs["psigestor-db-prod"]["databaseName"],
        )
        self.assertNotEqual(
            dbs["psigestor-db-staging"]["user"],
            dbs["psigestor-db-prod"]["user"],
        )

    def test_staging_and_production_services_branch_and_autodeploy_governance(self):
        services = {svc["name"]: svc for svc in self.blueprint.get("services", [])}
        self.assertIn("psigestor-api-staging", services)
        self.assertIn("psigestor-web-staging", services)
        self.assertIn("psigestor-api", services)
        self.assertIn("psigestor-web", services)

        # Staging tracks develop
        self.assertEqual(services["psigestor-api-staging"]["branch"], "develop")
        self.assertEqual(services["psigestor-web-staging"]["branch"], "develop")
        self.assertEqual(services["psigestor-web-staging"]["rootDir"], "frontend")
        self.assertEqual(services["psigestor-web-staging"]["healthCheckPath"], "/login")

        # Production tracks main exclusively and disables autoDeploy for manual approval gate
        self.assertEqual(services["psigestor-api"]["branch"], "main")
        self.assertFalse(services["psigestor-api"]["autoDeploy"])
        self.assertEqual(services["psigestor-web"]["branch"], "main")
        self.assertFalse(services["psigestor-web"]["autoDeploy"])
        self.assertEqual(services["psigestor-web"]["rootDir"], "frontend")
        self.assertEqual(services["psigestor-web"]["healthCheckPath"], "/login")

    def test_build_command_is_decoupled_from_database_migrations_and_uses_free_plan_by_default(self):
        services = {svc["name"]: svc for svc in self.blueprint.get("services", [])}
        dbs = {db["name"]: db for db in self.blueprint.get("databases", [])}

        # Default plan must be 'free' so no paid tier is assumed or required automatically
        for db_name, db_cfg in dbs.items():
            self.assertEqual(db_cfg.get("plan"), "free", f"{db_name} must default to free plan")
        for svc_name, svc_cfg in services.items():
            self.assertEqual(svc_cfg.get("plan"), "free", f"{svc_name} must default to free plan")

        # Neither staging nor production may run init_db inside buildCommand or startCommand,
        # nor rely on paid-only preDeployCommand on the default free plan
        for api_name in ("psigestor-api-staging", "psigestor-api"):
            self.assertNotIn("init_db", services[api_name]["buildCommand"])
            self.assertNotIn("init_db", services[api_name]["startCommand"])
            self.assertNotIn("preDeployCommand", services[api_name])

    def test_backend_services_enforce_healthcheck_gunicorn_and_no_hardcoded_secrets(self):
        services = {svc["name"]: svc for svc in self.blueprint.get("services", [])}

        for api_name, expected_env, expected_db in [
            ("psigestor-api-staging", "staging", "psigestor-db-staging"),
            ("psigestor-api", "production", "psigestor-db-prod"),
        ]:
            svc = services[api_name]
            self.assertEqual(svc["healthCheckPath"], "/health")
            self.assertIn("SKIP_DB_INIT_ON_IMPORT=true", svc["startCommand"])
            self.assertIn("gunicorn --chdir backend app.app:app", svc["startCommand"])

            env_map = {item["key"]: item for item in svc.get("envVars", [])}
            self.assertEqual(env_map["APP_ENV"]["value"], expected_env)
            self.assertEqual(env_map["FLASK_DEBUG"]["value"], "false")
            self.assertEqual(env_map["STRICT_AUTH"]["value"], "true")
            self.assertEqual(env_map["ENFORCE_CSRF_TOKEN"]["value"], "true")
            self.assertEqual(env_map["RATE_LIMIT_STORAGE"]["value"], "database")
            self.assertEqual(env_map["SESSION_COOKIE_SAMESITE"]["value"], "Lax")
            self.assertEqual(env_map["SESSION_COOKIE_SECURE"]["value"], "true")

            self.assertEqual(
                env_map["DATABASE_URL"]["fromDatabase"]["name"],
                expected_db,
            )
            self.assertTrue(env_map["SECRET_KEY"].get("generateValue"))
            self.assertTrue(env_map["MOBILE_TOKEN_SECRET"].get("generateValue"))
            self.assertFalse(env_map["INITIAL_PSYCHOLOGIST_PASSWORD"].get("sync", True))
            self.assertNotIn("value", env_map["INITIAL_PSYCHOLOGIST_PASSWORD"])

    def test_backend_dockerfile_and_dockerignore_safety(self):
        content = BACKEND_DOCKERFILE_PATH.read_text(encoding="utf-8")
        self.assertIn("COPY database /database", content)
        self.assertIn("SKIP_DB_INIT_ON_IMPORT=true", content)
        self.assertIn("exec gunicorn app.app:app", content)

        self.assertTrue(BACKEND_DOCKERIGNORE_PATH.exists())
        ignore_content = BACKEND_DOCKERIGNORE_PATH.read_text(encoding="utf-8")
        self.assertIn(".env", ignore_content)
        self.assertIn(".venv/", ignore_content)

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
        self.assertEqual(len(result["applied"]), 13)
        self.assertEqual(result["pending"], [])


if __name__ == "__main__":
    unittest.main()
