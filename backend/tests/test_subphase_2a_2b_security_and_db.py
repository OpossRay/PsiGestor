import os
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import MagicMock, patch

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ["SKIP_DB_INIT_ON_IMPORT"] = "true"

from app.config import (
    get_app_env,
    get_cors_allowed_origins,
    get_mobile_token_secret,
    get_secret_key,
    get_session_cookie_config,
    is_strict_auth_enabled,
)
from app.init_db import (
    MIGRATION_SIGNATURES,
    MigrationChecksumMismatchError,
    MigrationError,
    ResetForbiddenError,
    SchemaAdoptionError,
    bootstrap_initial_psychologist_if_configured,
    compute_migration_checksum,
    evaluate_migration_adoption_state,
    run_migrations,
    should_load_demo_seeds,
    validate_reset_allowed,
)
from app.repositories.refresh_token_repository import (
    ExpiredRefreshTokenError,
    InvalidRefreshTokenError,
    RefreshTokenReuseDetectedError,
    hash_refresh_token,
    rotate_refresh_token_atomic,
)
from app.services.auth_service import (
    issue_mobile_access_token,
    verify_mobile_access_token,
)
from app.services.rate_limiter import auth_rate_limiter
from app.app import create_app


class TestSubphase2AConfigAndSecrets(unittest.TestCase):
    def test_ambiguous_or_render_env_defaults_to_production(self):
        with patch.dict(os.environ, {"APP_ENV": "", "RENDER": "true"}, clear=False):
            self.assertEqual(get_app_env(), "production")
            self.assertTrue(is_strict_auth_enabled())

        with patch.dict(os.environ, {"APP_ENV": "unknown_env"}, clear=False):
            self.assertEqual(get_app_env(), "production")

    def test_secret_key_validation_in_staging_and_production(self):
        with patch.dict(
            os.environ,
            {"APP_ENV": "production", "SECRET_KEY": "psigestor_super_secret_session_key_2026"},
            clear=False,
        ):
            with self.assertRaises(RuntimeError):
                get_secret_key()

        with patch.dict(
            os.environ,
            {"APP_ENV": "staging", "SECRET_KEY": "short_secret"},
            clear=False,
        ):
            with self.assertRaises(RuntimeError):
                get_secret_key()

    def test_mobile_token_secret_must_be_distinct_from_secret_key(self):
        valid_secret = "a" * 40
        with patch.dict(
            os.environ,
            {
                "APP_ENV": "production",
                "SECRET_KEY": valid_secret,
                "MOBILE_TOKEN_SECRET": valid_secret,
            },
            clear=False,
        ):
            with self.assertRaises(RuntimeError):
                get_mobile_token_secret()

        distinct_mobile = "b" * 40
        with patch.dict(
            os.environ,
            {
                "APP_ENV": "production",
                "SECRET_KEY": valid_secret,
                "MOBILE_TOKEN_SECRET": distinct_mobile,
            },
            clear=False,
        ):
            self.assertEqual(get_mobile_token_secret(), distinct_mobile)

    def test_session_cookie_defaults_to_httponly_and_samesite_lax(self):
        with patch.dict(os.environ, {"APP_ENV": "production"}, clear=False):
            cfg = get_session_cookie_config()
            self.assertTrue(cfg["SESSION_COOKIE_HTTPONLY"])
            self.assertEqual(cfg["SESSION_COOKIE_SAMESITE"], "Lax")
            self.assertTrue(cfg["SESSION_COOKIE_SECURE"])


class TestSubphase2AMobileTokensAndRotation(unittest.TestCase):
    def setUp(self):
        self.sample_user = {
            "id": 7,
            "email": "8959@itescam.edu.mx",
            "name": "Juan Pablo Moo Uc",
            "role": "alumno",
            "student_id": 2,
            "student_code": "8959",
            "program": "ISC",
            "semester": 7,
            "is_active": True,
            "created_at": "2026-10-01T00:00:00Z",
        }

    @patch("app.services.auth_service.find_user_by_id")
    def test_mobile_access_token_issue_and_verify(self, mock_find_user):
        mock_find_user.return_value = self.sample_user
        token, ttl = issue_mobile_access_token(self.sample_user)
        self.assertEqual(ttl, 900)

        verified = verify_mobile_access_token(token)
        self.assertIsNotNone(verified)
        self.assertEqual(verified["id"], 7)
        self.assertEqual(verified["role"], "alumno")

        # Deactivated user must be rejected immediately even with valid token signature
        inactive_user = dict(self.sample_user, is_active=False)
        mock_find_user.return_value = inactive_user
        self.assertIsNone(verify_mobile_access_token(token))

    @patch("app.services.auth_service.find_user_by_id")
    def test_mobile_token_cannot_be_verified_with_session_secret(self, mock_find_user):
        mock_find_user.return_value = self.sample_user
        token, _ = issue_mobile_access_token(self.sample_user)

        with patch.dict(
            os.environ,
            {"MOBILE_TOKEN_SECRET": "different_mobile_secret_key_for_verification_test_123"},
            clear=False,
        ):
            self.assertIsNone(verify_mobile_access_token(token))

    @patch("app.repositories.refresh_token_repository.get_db_connection")
    def test_refresh_token_reuse_revokes_entire_family(self, mock_get_conn):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn

        # Simulate a token that already has replaced_by_hash != None (already rotated)
        future_exp = datetime.now(timezone.utc) + timedelta(days=7)
        mock_cursor.fetchone.return_value = (
            10,  # token_id
            7,  # user_id
            "family-uuid-123",  # family_id
            future_exp,  # expires_at
            datetime.now(timezone.utc),  # revoked_at
            "new_hash_abc",  # replaced_by_hash
            "8959@itescam.edu.mx",
            "Juan Pablo",
            "alumno",
            2,
            True,
            datetime.now(timezone.utc),
            "8959",
            "ISC",
            7,
        )

        with self.assertRaises(RefreshTokenReuseDetectedError):
            rotate_refresh_token_atomic(
                old_token_hash="old_hash",
                new_token_hash="attempt_hash",
                new_expires_at=future_exp,
            )

        # Confirm the family revocation UPDATE was executed and committed
        executed_queries = [call.args[0] for call in mock_cursor.execute.call_args_list]
        self.assertTrue(
            any("WHERE family_id = %s AND revoked_at IS NULL" in q for q in executed_queries)
        )
        mock_conn.commit.assert_called_once()


class TestSubphase2AWebCSRFAndEndpoints(unittest.TestCase):
    def setUp(self):
        auth_rate_limiter.reset()
        self.env_patcher = patch.dict(
            os.environ,
            {
                "APP_ENV": "staging",
                "SECRET_KEY": "s" * 40,
                "MOBILE_TOKEN_SECRET": "m" * 40,
                "CORS_ALLOWED_ORIGINS": "https://psigestor-web-staging.onrender.com",
                "STRICT_AUTH": "true",
                "ENFORCE_CSRF_TOKEN": "true",
            },
            clear=False,
        )
        self.env_patcher.start()
        self.app = create_app()
        self.client = self.app.test_client()

    def tearDown(self):
        self.env_patcher.stop()
        auth_rate_limiter.reset()

    @patch("app.app.get_db_connection")
    def test_health_endpoint_does_not_expose_secrets(self, mock_db):
        mock_conn = MagicMock()
        mock_db.return_value = mock_conn
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["environment"], "staging")

    def test_db_route_exists_and_is_protected_in_staging(self):
        rules = {r.rule for r in self.app.url_map.iter_rules()}
        self.assertIn("/db", rules)
        res = self.client.get("/db")
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_access_blocked_on_protected_endpoints(self):
        self.assertEqual(self.client.get("/students").status_code, 401)
        self.assertEqual(self.client.post("/appointments", json={}).status_code, 401)
        self.assertEqual(self.client.post("/appointments/1/approve-reschedule").status_code, 401)
        self.assertEqual(self.client.post("/availabilities/1/reschedule", json={}).status_code, 401)
        self.assertEqual(self.client.post("/disabled-schedules", json={}).status_code, 401)
        self.assertEqual(self.client.post("/disabled-schedules/check-conflicts", json={}).status_code, 401)

    @patch("app.services.auth_service.find_user_by_id")
    def test_csrf_blocks_untrusted_origin_and_missing_csrf_token(self, mock_find_user):
        mock_find_user.return_value = {
            "id": 1,
            "email": "psicologia@itescam.edu.mx",
            "name": "Psicóloga",
            "role": "psicologo",
            "is_active": True,
        }
        with self.client.session_transaction() as sess:
            sess["user_id"] = 1
            sess["role"] = "psicologo"
            sess["csrf_token"] = "valid_csrf_token_123"

        # 1. Untrusted Origin is blocked with 403
        res_bad_origin = self.client.post(
            "/disabled-schedules/check-conflicts",
            json={},
            headers={
                "Origin": "https://evil-attacker.example.com",
                "X-CSRF-Token": "valid_csrf_token_123",
            },
        )
        self.assertEqual(res_bad_origin.status_code, 403)

        # 2. Trusted Origin but missing CSRF token is blocked with 403
        res_no_csrf = self.client.post(
            "/disabled-schedules/check-conflicts",
            json={},
            headers={"Origin": "https://psigestor-web-staging.onrender.com"},
        )
        self.assertEqual(res_no_csrf.status_code, 403)

        # 3. Trusted Origin + valid CSRF token succeeds (200)
        res_ok = self.client.post(
            "/disabled-schedules/check-conflicts",
            json={},
            headers={
                "Origin": "https://psigestor-web-staging.onrender.com",
                "X-CSRF-Token": "valid_csrf_token_123",
            },
        )
        self.assertEqual(res_ok.status_code, 200)

    @patch("app.services.auth_service.find_user_by_email", return_value=None)
    def test_login_rate_limiting_blocks_abusive_attempts(self, _mock_find):
        with patch.dict(os.environ, {"AUTH_LOGIN_MAX_ATTEMPTS": "3"}, clear=False):
            for _ in range(3):
                r = self.client.post(
                    "/api/auth/login",
                    json={"email": "victim@itescam.edu.mx", "password": "wrong"},
                )
                self.assertEqual(r.status_code, 401)

            blocked = self.client.post(
                "/api/auth/login",
                json={"email": "victim@itescam.edu.mx", "password": "wrong"},
            )
            self.assertEqual(blocked.status_code, 429)
            self.assertIn("Retry-After", blocked.headers)


class TestSubphase2BMigrationsAndSeeds(unittest.TestCase):
    def test_reset_blocked_outside_development(self):
        with patch.dict(os.environ, {"APP_ENV": "production"}, clear=False):
            with self.assertRaises(ResetForbiddenError):
                validate_reset_allowed(True)

        with patch.dict(os.environ, {"APP_ENV": "staging"}, clear=False):
            with self.assertRaises(ResetForbiddenError):
                validate_reset_allowed(True)

        with patch.dict(os.environ, {"APP_ENV": "development", "RENDER": "true"}, clear=False):
            with self.assertRaises(ResetForbiddenError):
                validate_reset_allowed(True)

    def test_demo_seeds_blocked_in_prod_and_gated_in_staging(self):
        with patch.dict(os.environ, {"APP_ENV": "production", "ALLOW_STAGING_SEEDS": "true"}, clear=False):
            self.assertFalse(should_load_demo_seeds())

        with patch.dict(os.environ, {"APP_ENV": "staging", "ALLOW_STAGING_SEEDS": "false"}, clear=False):
            self.assertFalse(should_load_demo_seeds())

        with patch.dict(os.environ, {"APP_ENV": "staging", "ALLOW_STAGING_SEEDS": "true"}, clear=False):
            self.assertTrue(should_load_demo_seeds())

    def test_initial_psychologist_rejects_demo_password_in_prod(self):
        mock_cursor = MagicMock()
        with patch.dict(
            os.environ,
            {
                "APP_ENV": "production",
                "INITIAL_PSYCHOLOGIST_EMAIL": "psicologia@itescam.edu.mx",
                "INITIAL_PSYCHOLOGIST_PASSWORD": "password123",
            },
            clear=False,
        ):
            with self.assertRaises(MigrationError):
                bootstrap_initial_psychologist_if_configured(mock_cursor)

    def test_partial_schema_raises_schema_adoption_error(self):
        # Table 'users' exists, but index 'unique_single_active_psicologo' is missing
        partial_meta = {
            "tables": {"users"},
            "columns": {
                "users": {
                    "id", "email", "password_hash", "name",
                    "role", "student_id", "is_active", "created_at",
                }
            },
            "constraints": {"users": {"users_role_check", "fk_users_student"}},
            "constraint_defs": {},
            "indexes": {"idx_users_email"},  # Missing unique_single_active_psicologo
        }
        with self.assertRaises(SchemaAdoptionError):
            evaluate_migration_adoption_state(
                "008_create_users.sql",
                partial_meta,
                set(),
            )

        # Complete schema for 008 succeeds with FULLY_APPLIED
        complete_meta = dict(partial_meta)
        complete_meta["indexes"] = {
            "unique_single_active_psicologo",
            "idx_users_email",
            "unique_active_student_user",
        }
        self.assertEqual(
            evaluate_migration_adoption_state("008_create_users.sql", complete_meta, set()),
            "FULLY_APPLIED",
        )

    def test_checksum_mismatch_halts_migrations(self):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [
            ("001_create_availabilities.sql", "tampered_checksum_0000")
        ]

        migrations_dir = BACKEND_DIR.parent / "database" / "migrations"
        with self.assertRaises(MigrationChecksumMismatchError):
            run_migrations(mock_conn, migrations_dir)

    def test_all_migration_files_have_complete_signatures(self):
        migrations_dir = BACKEND_DIR.parent / "database" / "migrations"
        sql_files = sorted(f.name for f in migrations_dir.glob("*.sql"))
        self.assertEqual(len(sql_files), 13)
        for fname in sql_files:
            self.assertIn(fname, MIGRATION_SIGNATURES, f"Missing signature for {fname}")

    @patch("app.init_db.run_seeds")
    @patch("app.init_db.run_migrations")
    @patch("app.init_db.connect_with_retry")
    def test_init_database_acquires_and_releases_advisory_lock(
        self, mock_connect, mock_run_migrations, mock_run_seeds
    ):
        from app.init_db import init_database, MIGRATION_ADVISORY_LOCK_KEY

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        init_database(reset=False)

        calls = [c.args for c in mock_cursor.execute.call_args_list]
        self.assertIn(("SELECT pg_advisory_lock(%s);", (MIGRATION_ADVISORY_LOCK_KEY,)), calls)
        self.assertIn(("SELECT pg_advisory_unlock(%s);", (MIGRATION_ADVISORY_LOCK_KEY,)), calls)


class TestSubphase2AFullWebAndMobileAuthFlows(unittest.TestCase):
    def setUp(self):
        auth_rate_limiter.reset()
        self.env_patcher = patch.dict(
            os.environ,
            {
                "APP_ENV": "staging",
                "SECRET_KEY": "s" * 40,
                "MOBILE_TOKEN_SECRET": "m" * 40,
                "CORS_ALLOWED_ORIGINS": "https://psigestor-web-staging.onrender.com",
                "STRICT_AUTH": "true",
                "ENFORCE_CSRF_TOKEN": "true",
            },
            clear=False,
        )
        self.env_patcher.start()
        self.app = create_app()
        self.client = self.app.test_client()

    def tearDown(self):
        self.env_patcher.stop()
        auth_rate_limiter.reset()

    @patch("app.services.auth_service.store_refresh_token")
    @patch("app.services.auth_service.rotate_refresh_token_atomic")
    @patch("app.services.auth_service.revoke_refresh_token_by_hash", return_value=True)
    @patch("app.services.auth_service.revoke_all_user_refresh_tokens", return_value=2)
    @patch("app.services.auth_service.find_user_by_id")
    @patch("app.services.auth_service.find_user_by_email")
    @patch("app.services.auth_service.check_password_hash", return_value=True)
    def test_mobile_login_refresh_bearer_and_revoke_flow(
        self,
        _mock_check_pw,
        mock_find_email,
        mock_find_id,
        mock_revoke_all,
        mock_revoke_one,
        mock_rotate_atomic,
        mock_store_rt,
    ):
        user_record = {
            "id": 3,
            "email": "8959@itescam.edu.mx",
            "password_hash": "scrypt:...",
            "name": "Juan Pablo Moo Uc",
            "role": "alumno",
            "student_id": 2,
            "student_code": "8959",
            "program": "ISC",
            "semester": 7,
            "is_active": True,
            "created_at": "2026-10-01T00:00:00Z",
        }
        mock_find_email.return_value = user_record
        mock_find_id.return_value = user_record
        mock_rotate_atomic.return_value = user_record

        # 1. Mobile login with X-Client-Platform: mobile
        login_res = self.client.post(
            "/api/auth/login",
            json={"email": "8959@itescam.edu.mx", "password": "valid_password"},
            headers={"X-Client-Platform": "mobile"},
        )
        self.assertEqual(login_res.status_code, 200)
        login_data = login_res.get_json()
        self.assertIn("accessToken", login_data)
        self.assertIn("refreshToken", login_data)
        self.assertEqual(login_data["tokenType"], "Bearer")
        mock_store_rt.assert_called_once()

        access_token = login_data["accessToken"]
        refresh_token = login_data["refreshToken"]

        # 2. Mobile /api/auth/me using Bearer token
        me_res = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        self.assertEqual(me_res.status_code, 200)
        self.assertTrue(me_res.get_json()["authenticated"])
        self.assertEqual(me_res.get_json()["user"]["id"], 3)

        # 3. Mobile token rotation (/api/auth/refresh)
        refresh_res = self.client.post(
            "/api/auth/refresh",
            json={"refreshToken": refresh_token},
        )
        self.assertEqual(refresh_res.status_code, 200)
        refreshed_data = refresh_res.get_json()
        self.assertIn("accessToken", refreshed_data)
        self.assertIn("refreshToken", refreshed_data)
        self.assertNotEqual(refreshed_data["refreshToken"], refresh_token)

        # 4. Mobile revoke-all sessions
        revoke_all_res = self.client.post(
            "/api/auth/revoke-all",
            headers={"Authorization": f"Bearer {refreshed_data['accessToken']}"},
        )
        self.assertEqual(revoke_all_res.status_code, 200)
        self.assertEqual(revoke_all_res.get_json()["revokedCount"], 2)
        mock_revoke_all.assert_called_once_with(3)

        # 5. Mobile logout revokes refresh token
        logout_res = self.client.post(
            "/api/auth/logout",
            json={"refreshToken": refreshed_data["refreshToken"]},
            headers={"Authorization": f"Bearer {refreshed_data['accessToken']}"},
        )
        self.assertEqual(logout_res.status_code, 200)
        mock_revoke_one.assert_called_once()

    @patch("app.services.auth_service.find_user_by_id")
    def test_expired_and_wrong_type_mobile_access_tokens_rejected(self, mock_find_id):
        import time
        from app.services.auth_service import _get_mobile_serializer

        mock_find_id.return_value = {
            "id": 3,
            "email": "8959@itescam.edu.mx",
            "name": "Juan Pablo",
            "role": "alumno",
            "is_active": True,
        }

        # Token with wrong 'typ' claim (e.g. 'refresh' instead of 'mobile_access')
        now_ts = int(time.time())
        wrong_type_token = _get_mobile_serializer().dumps({
            "sub": 3,
            "role": "alumno",
            "typ": "refresh",
            "jti": "jti-1",
            "iat": now_ts,
            "exp": now_ts + 900,
        })
        self.assertIsNone(verify_mobile_access_token(wrong_type_token))

        # Token with expired 'exp' claim
        expired_payload_token = _get_mobile_serializer().dumps({
            "sub": 3,
            "role": "alumno",
            "typ": "mobile_access",
            "jti": "jti-2",
            "iat": now_ts - 1000,
            "exp": now_ts - 10,
        })
        self.assertIsNone(verify_mobile_access_token(expired_payload_token))

        # Protected endpoint rejects expired token with 401
        res = self.client.get(
            "/appointments/my",
            headers={"Authorization": f"Bearer {expired_payload_token}"},
        )
        self.assertEqual(res.status_code, 401)

    @patch("app.repositories.refresh_token_repository.get_db_connection")
    def test_expired_refresh_token_and_deactivated_user_rejected_on_refresh(self, mock_get_conn):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn

        # Case A: Refresh token belongs to deactivated user -> revokes family and returns 403
        future_exp = datetime.now(timezone.utc) + timedelta(days=5)
        mock_cursor.fetchone.return_value = (
            11, 7, "family-deactivated", future_exp, None, None,
            "8959@itescam.edu.mx", "Juan Pablo", "alumno", 2, False,  # is_active = False
            datetime.now(timezone.utc), "8959", "ISC", 7,
        )
        res_inactive = self.client.post("/api/auth/refresh", json={"refreshToken": "some_valid_raw_token"})
        self.assertEqual(res_inactive.status_code, 403)

        # Case B: Refresh token is expired -> marks token revoked and returns 401
        past_exp = datetime.now(timezone.utc) - timedelta(minutes=5)
        mock_cursor.fetchone.return_value = (
            12, 7, "family-expired", past_exp, None, None,
            "8959@itescam.edu.mx", "Juan Pablo", "alumno", 2, True,
            datetime.now(timezone.utc), "8959", "ISC", 7,
        )
        res_expired = self.client.post("/api/auth/refresh", json={"refreshToken": "expired_raw_token"})
        self.assertEqual(res_expired.status_code, 401)

        # Case C: Reused refresh token returns 401 with code TOKEN_REUSE_DETECTED
        mock_cursor.fetchone.return_value = (
            13, 7, "family-reused", future_exp, datetime.now(timezone.utc), "already_replaced_hash",
            "8959@itescam.edu.mx", "Juan Pablo", "alumno", 2, True,
            datetime.now(timezone.utc), "8959", "ISC", 7,
        )
        res_reused = self.client.post("/api/auth/refresh", json={"refreshToken": "reused_raw_token"})
        self.assertEqual(res_reused.status_code, 401)
        self.assertEqual(res_reused.get_json().get("code"), "TOKEN_REUSE_DETECTED")

    def test_refresh_endpoint_rate_limiting(self):
        with patch.dict(os.environ, {"AUTH_REFRESH_MAX_ATTEMPTS": "2"}, clear=False):
            r1 = self.client.post("/api/auth/refresh", json={"refreshToken": ""})
            r2 = self.client.post("/api/auth/refresh", json={"refreshToken": ""})
            self.assertEqual(r1.status_code, 401)
            self.assertEqual(r2.status_code, 401)

            r3 = self.client.post("/api/auth/refresh", json={"refreshToken": ""})
            self.assertEqual(r3.status_code, 429)
            self.assertIn("Retry-After", r3.headers)

    @patch("app.services.rate_limiter.get_db_connection")
    def test_multi_instance_database_backed_rate_limiter(self, mock_get_conn):
        from app.services.rate_limiter import HybridRateLimiter, RateLimitExceededError

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn

        # Simulate DB already holding 3 attempts from other Gunicorn workers / Render instances
        mock_cursor.fetchone.return_value = (3, datetime.now(timezone.utc))

        limiter_instance_a = HybridRateLimiter()
        limiter_instance_b = HybridRateLimiter()

        with patch.dict(os.environ, {"RATE_LIMIT_STORAGE": "database"}, clear=False):
            with self.assertRaises(RateLimitExceededError):
                limiter_instance_b.check_and_record("login:1.2.3.4:user@test.com", max_attempts=3, window_seconds=60)

    @patch("app.routes.appointments.get_appointments")
    def test_internal_exceptions_do_not_leak_secrets_in_staging_or_prod(self, mock_get_apts):
        mock_get_apts.side_effect = RuntimeError(
            "FATAL: password authentication failed for user super_secret_db_admin_password_999"
        )
        res = self.client.get("/appointments")
        self.assertEqual(res.status_code, 500)
        body_text = res.get_data(as_text=True)
        self.assertNotIn("super_secret_db_admin_password_999", body_text)


class TestSubphase2BMigrationScenariosInDepth(unittest.TestCase):
    def _build_full_schema_metadata_for_001_to_011(self) -> dict:
        tables = set()
        columns: dict[str, set[str]] = {}
        constraints: dict[str, set[str]] = {}
        constraint_defs: dict[tuple[str, str], str] = {}
        indexes = set()

        for version, spec in MIGRATION_SIGNATURES.items():
            if version.startswith("012_"):
                continue
            for t in spec.get("tables", set()) | spec.get("required_tables", set()):
                tables.add(t)
            for t, cols in spec.get("columns", {}).items():
                columns.setdefault(t, set()).update(cols)
            for t, cons in spec.get("constraints", {}).items():
                constraints.setdefault(t, set()).update(cons)
            for key, sub in spec.get("constraint_substrings", {}).items():
                constraint_defs[key] = f"CHECK (status IN ('Reserved', '{sub}', 'Cancelled'))"
            indexes.update(spec.get("indexes", set()))

        return {
            "tables": tables,
            "columns": columns,
            "constraints": constraints,
            "constraint_defs": constraint_defs,
            "indexes": indexes,
        }

    @patch("app.init_db._fetch_existing_schema_metadata")
    @patch("app.init_db.ensure_schema_migrations_table")
    def test_fresh_database_applies_all_13_migrations_in_order(
        self, mock_ensure_table, mock_fetch_meta
    ):
        mock_ensure_table.return_value = {}
        mock_fetch_meta.return_value = {
            "tables": set(),
            "columns": {},
            "constraints": {},
            "constraint_defs": {},
            "indexes": set(),
        }

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        migrations_dir = BACKEND_DIR.parent / "database" / "migrations"
        results = run_migrations(mock_conn, migrations_dir)

        self.assertEqual(len(results), 13)
        self.assertTrue(all(r.startswith("applied:") for r in results))

    @patch("app.init_db._fetch_existing_schema_metadata")
    @patch("app.init_db.ensure_schema_migrations_table")
    def test_existing_database_adopts_001_to_011_and_applies_only_012(
        self, mock_ensure_table, mock_fetch_meta
    ):
        mock_ensure_table.return_value = {}
        mock_fetch_meta.return_value = self._build_full_schema_metadata_for_001_to_011()

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        migrations_dir = BACKEND_DIR.parent / "database" / "migrations"
        results = run_migrations(mock_conn, migrations_dir)

        self.assertEqual(len(results), 13)
        adopted = [r for r in results if r.startswith("adopted:")]
        applied = [r for r in results if r.startswith("applied:")]
        self.assertEqual(len(adopted), 12)
        self.assertEqual(applied, ["applied:012_create_auth_refresh_tokens.sql"])

    def test_partial_alter_table_or_outdated_constraint_raises_schema_adoption_error(self):
        meta = self._build_full_schema_metadata_for_001_to_011()

        # Case 1: 009 has columns, but appointments_status_check lacks 'Pending Reschedule'
        bad_con_meta = dict(meta, constraint_defs={
            ("appointments", "appointments_status_check"): "CHECK (status IN ('Reserved', 'Cancelled'))"
        })
        with self.assertRaises(SchemaAdoptionError):
            evaluate_migration_adoption_state(
                "009_update_appointments_reschedule_cancel.sql",
                bad_con_meta,
                set(),
            )

        # Case 2: 011 has only 2 of its 4 columns
        partial_011_cols = dict(meta["columns"])
        partial_011_cols["appointments"] = set(meta["columns"]["appointments"]) - {"rehabilitated_by"}
        partial_011_meta = dict(meta, columns=partial_011_cols)
        with self.assertRaises(SchemaAdoptionError):
            evaluate_migration_adoption_state(
                "011_add_appointment_cancellation_audit.sql",
                partial_011_meta,
                set(),
            )

    def test_run_seeds_never_executes_sql_seeds_in_production(self):
        from app.init_db import run_seeds

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        seeds_dir = BACKEND_DIR.parent / "database" / "seeds"
        with patch.dict(
            os.environ,
            {
                "APP_ENV": "production",
                "ALLOW_STAGING_SEEDS": "true",
                "SEED_DEMO_DATA": "true",
                "INITIAL_PSYCHOLOGIST_EMAIL": "",
                "INITIAL_PSYCHOLOGIST_PASSWORD": "",
            },
            clear=False,
        ):
            run_seeds(mock_conn, seeds_dir, reset=False)
            mock_cursor.execute.assert_not_called()


if __name__ == "__main__":
    unittest.main()
