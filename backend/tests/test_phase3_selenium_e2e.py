from datetime import date, time, datetime, timezone
import os
from pathlib import Path
import socket
import sys
import threading
import unittest
from unittest.mock import patch

from flask import send_from_directory, request
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from werkzeug.security import generate_password_hash
from werkzeug.serving import make_server

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
BROWSER_DIST_DIR = REPO_ROOT / "frontend" / "dist" / "PsiGestor" / "browser"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ["SKIP_DB_INIT_ON_IMPORT"] = "true"

from app.app import create_app
from app.services.rate_limiter import auth_rate_limiter


PSYCH_HASH = generate_password_hash("SecurePsychPass2026!")
STUDENT_HASH = generate_password_hash("SecureStudentPass2026!")

MOCK_USERS_BY_ID = {
    1: {
        "id": 1,
        "email": "psicologia@itescam.edu.mx",
        "password_hash": PSYCH_HASH,
        "name": "Lic. Psicología ITESCAM",
        "role": "psicologo",
        "student_id": None,
        "student_code": None,
        "program": None,
        "semester": None,
        "is_active": True,
        "created_at": "2026-10-01T00:00:00Z",
    },
    2: {
        "id": 2,
        "email": "8959@itescam.edu.mx",
        "password_hash": STUDENT_HASH,
        "name": "Juan Pablo Moo Uc",
        "role": "alumno",
        "student_id": 7,
        "student_code": "8959",
        "program": "Ingeniería en Sistemas Computacionales",
        "semester": 7,
        "is_active": True,
        "created_at": "2026-10-01T00:00:00Z",
    },
}


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def _mock_find_user_by_email(email: str):
    clean = (email or "").strip().lower()
    for u in MOCK_USERS_BY_ID.values():
        if u["email"].lower() == clean:
            return dict(u)
    return None


def _mock_find_user_by_id(user_id: int):
    u = MOCK_USERS_BY_ID.get(int(user_id))
    return dict(u) if u else None


class TestPhase3SeleniumFunctionalBrowserE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not BROWSER_DIST_DIR.exists():
            raise unittest.SkipTest(
                f"Frontend browser build not found at {BROWSER_DIST_DIR}. Run ng build first."
            )

        cls.port = _find_free_port()
        cls.base_url = f"http://127.0.0.1:{cls.port}"

        cls.env_patcher = patch.dict(
            os.environ,
            {
                "APP_ENV": "staging",
                "SECRET_KEY": "s" * 40,
                "MOBILE_TOKEN_SECRET": "m" * 40,
                "CORS_ALLOWED_ORIGINS": cls.base_url,
                "SESSION_COOKIE_SECURE": "false",
                "STRICT_AUTH": "true",
                "ENFORCE_CSRF_TOKEN": "true",
            },
            clear=False,
        )
        cls.env_patcher.start()

        cls.patches = [
            patch("app.services.auth_service.find_user_by_email", side_effect=_mock_find_user_by_email),
            patch("app.services.auth_service.find_user_by_id", side_effect=_mock_find_user_by_id),
            patch(
                "app.routes.availability.list_availabilities",
                return_value=[
                    (
                        101, date(2026, 11, 25), time(9, 0), time(10, 0), 60, 0,
                        "Disponible", datetime(2026, 11, 19, tzinfo=timezone.utc),
                        None, None, None, None, None, None,
                        "Presencial", "Cubículo 2B", None,
                        None, None, None, None, None, "psicologo",
                    )
                ],
            ),
            patch("app.routes.availability.list_disabled_schedules", return_value=[]),
            patch("app.routes.appointments.get_appointments", return_value=[]),
            patch("app.routes.appointments.get_student_appointments", return_value=[]),
            patch("app.routes.regular_schedule.get_regular_schedule_config", return_value=None),
        ]
        for p in cls.patches:
            p.start()

        flask_app = create_app()

        # Mount same-origin /backend-api/* proxy dispatcher and Angular SPA static handler
        # so the production Angular build (apiUrl: '/backend-api') and Flask run on the same origin
        @flask_app.route(
            "/backend-api/<path:subpath>",
            methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        )
        def proxy_backend_api(subpath: str):
            target_path = f"/{subpath}"
            if request.query_string:
                target_path += f"?{request.query_string.decode('utf-8')}"
            with flask_app.request_context(
                {
                    **request.environ,
                    "PATH_INFO": f"/{subpath}",
                    "REQUEST_URI": target_path,
                }
            ):
                return flask_app.full_dispatch_request()

        index_file = "index.csr.html" if (BROWSER_DIST_DIR / "index.csr.html").exists() else "index.html"

        @flask_app.route("/login")
        @flask_app.route("/register")
        @flask_app.route("/calendar")
        @flask_app.route("/portal-alumno")
        @flask_app.route("/patient/<path:_rest>")
        @flask_app.route("/psychologist")
        @flask_app.route("/psychologist/<path:_rest>")
        def serve_spa_routes(_rest: str = ""):
            return send_from_directory(BROWSER_DIST_DIR, index_file)

        @flask_app.route("/<path:asset_path>")
        def serve_static_assets(asset_path: str):
            candidate = BROWSER_DIST_DIR / asset_path
            if candidate.is_file():
                return send_from_directory(BROWSER_DIST_DIR, asset_path)
            return send_from_directory(BROWSER_DIST_DIR, index_file)

        cls.server = make_server("127.0.0.1", cls.port, flask_app, threaded=True)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()

        chrome_opts = ChromeOptions()
        chrome_opts.add_argument("--headless=new")
        chrome_opts.add_argument("--no-sandbox")
        chrome_opts.add_argument("--disable-gpu")
        chrome_opts.add_argument("--disable-dev-shm-usage")
        chrome_opts.add_argument("--window-size=1440,900")

        cls.driver = webdriver.Chrome(options=chrome_opts)

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "driver") and cls.driver:
            cls.driver.quit()
        if hasattr(cls, "server") and cls.server:
            cls.server.shutdown()
        for p in getattr(cls, "patches", []):
            p.stop()
        if hasattr(cls, "env_patcher"):
            cls.env_patcher.stop()

    def setUp(self):
        auth_rate_limiter.reset()
        self.driver.delete_all_cookies()

    def test_1_swagger_apidocs_renders_in_real_browser(self):
        self.driver.get(f"{self.base_url}/apidocs/")
        wait = WebDriverWait(self.driver, 15)
        title_el = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".title, .swagger-ui"))
        )
        self.assertIsNotNone(title_el)
        wait.until(lambda d: "PsiGestor API" in d.page_source)
        self.assertIn("PsiGestor API", self.driver.page_source)

    def test_2_unauthenticated_navigation_to_protected_routes_redirects_to_login(self):
        self.driver.get(f"{self.base_url}/calendar")
        wait = WebDriverWait(self.driver, 15)
        wait.until(EC.url_contains("/login"))
        heading = wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, ".card-title"))
        )
        self.assertIn("Bienvenido", heading.text)

        self.driver.get(f"{self.base_url}/portal-alumno")
        wait.until(EC.url_contains("/login"))

    def test_3_psychologist_login_sets_httponly_session_and_navigates_to_calendar(self):
        self.driver.get(f"{self.base_url}/login")
        wait = WebDriverWait(self.driver, 15)

        email_input = wait.until(EC.visibility_of_element_located((By.ID, "email")))
        password_input = self.driver.find_element(By.ID, "password")
        submit_btn = self.driver.find_element(By.CSS_SELECTOR, "button.btn-submit")

        email_input.clear()
        email_input.send_keys("psicologia@itescam.edu.mx")
        password_input.clear()
        password_input.send_keys("SecurePsychPass2026!")
        submit_btn.click()

        wait.until(EC.url_contains("/calendar"))
        self.assertIn("/calendar", self.driver.current_url)

        # Verify zero tokens stored in localStorage or sessionStorage
        local_len = self.driver.execute_script("return window.localStorage.length;")
        session_len = self.driver.execute_script("return window.sessionStorage.length;")
        self.assertEqual(local_len, 0)
        self.assertEqual(session_len, 0)

        # Verify session cookie is HttpOnly (invisible to document.cookie, visible to browser cookie jar)
        doc_cookie = self.driver.execute_script("return document.cookie;")
        self.assertNotIn("session=", doc_cookie)
        browser_cookies = {c["name"]: c for c in self.driver.get_cookies()}
        self.assertIn("session", browser_cookies)
        self.assertTrue(browser_cookies["session"].get("httpOnly"))

    def test_4_student_login_navigates_to_student_portal_and_blocks_psychologist_calendar(self):
        self.driver.get(f"{self.base_url}/login")
        wait = WebDriverWait(self.driver, 15)

        email_input = wait.until(EC.visibility_of_element_located((By.ID, "email")))
        password_input = self.driver.find_element(By.ID, "password")
        submit_btn = self.driver.find_element(By.CSS_SELECTOR, "button.btn-submit")

        email_input.clear()
        email_input.send_keys("8959@itescam.edu.mx")
        password_input.clear()
        password_input.send_keys("SecureStudentPass2026!")
        submit_btn.click()

        wait.until(EC.url_contains("/portal-alumno"))
        self.assertIn("/portal-alumno", self.driver.current_url)

        # Student attempting to access psychologist /calendar is redirected back to /portal-alumno by roleGuard
        self.driver.get(f"{self.base_url}/calendar")
        wait.until(EC.url_contains("/portal-alumno"))
        self.assertIn("/portal-alumno", self.driver.current_url)


if __name__ == "__main__":
    unittest.main()
