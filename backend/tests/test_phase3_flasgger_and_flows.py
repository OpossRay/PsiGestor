import os
import sys
from pathlib import Path
from datetime import date, time, datetime, timezone
import unittest
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ["SKIP_DB_INIT_ON_IMPORT"] = "true"

from app.app import create_app
from app.services.auth_service import issue_mobile_access_token
from app.services.rate_limiter import auth_rate_limiter


PSYCHOLOGIST_USER = {
    "id": 1,
    "email": "psicologia@itescam.edu.mx",
    "name": "Lic. Psicología ITESCAM",
    "role": "psicologo",
    "student_id": None,
    "student_code": None,
    "program": None,
    "semester": None,
    "is_active": True,
    "created_at": "2026-10-01T00:00:00Z",
}

STUDENT_USER = {
    "id": 2,
    "email": "alumno.test@itescam.edu.mx",
    "name": "Estudiante Prueba",
    "role": "alumno",
    "student_id": 7,
    "student_code": "TEST2026007",
    "program": "Ingeniería en Sistemas Computacionales",
    "semester": 7,
    "is_active": True,
    "created_at": "2026-10-01T00:00:00Z",
}


class TestPhase3FlasggerDocumentation(unittest.TestCase):
    def setUp(self):
        self.env_patcher = patch.dict(
            os.environ,
            {
                "APP_ENV": "staging",
                "SECRET_KEY": "s" * 40,
                "MOBILE_TOKEN_SECRET": "m" * 40,
                "CORS_ALLOWED_ORIGINS": "https://psigestor-web-staging.onrender.com",
            },
            clear=False,
        )
        self.env_patcher.start()
        self.app = create_app()
        self.client = self.app.test_client()

    def tearDown(self):
        self.env_patcher.stop()

    def test_apidocs_ui_loads_successfully(self):
        res = self.client.get("/apidocs/")
        self.assertEqual(res.status_code, 200)
        html = res.get_data(as_text=True)
        self.assertIn("Flasgger", html)

    def test_apispec_json_contains_all_documented_endpoints_and_security_definitions(self):
        res = self.client.get("/apispec_1.json")
        self.assertEqual(res.status_code, 200)
        spec = res.get_json()
        self.assertIsNotNone(spec)
        self.assertEqual(spec["info"]["title"], "PsiGestor API")
        self.assertIn("BearerAuth", spec.get("securityDefinitions", {}))
        self.assertIn("CsrfToken", spec.get("securityDefinitions", {}))

        paths = spec.get("paths", {})
        expected_paths = [
            "/",
            "/health",
            "/db",
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/auth/logout",
            "/api/auth/revoke-all",
            "/api/auth/me",
            "/appointments",
            "/appointments/book",
            "/appointments/my",
            "/appointments/{appointment_id}/cancel",
            "/appointments/{appointment_id}/reschedule-request",
            "/appointments/{appointment_id}/approve-reschedule",
            "/appointments/{appointment_id}/reject-reschedule",
            "/availabilities",
            "/availabilities/{id}/cancel",
            "/availabilities/{id}/rehabilitate",
            "/availabilities/{id}/reschedule",
            "/availabilities/{id}/approve-reschedule",
            "/availabilities/{id}/reject-reschedule",
            "/disabled-schedules",
            "/disabled-schedules/check-conflicts",
            "/disabled-schedules/{schedule_id}",
            "/regular-schedule",
            "/students",
        ]
        for ep in expected_paths:
            self.assertIn(ep, paths, f"Endpoint {ep} missing from Flasgger /apispec_1.json")


class TestPhase3RBACPrivacyAndCoreFlows(unittest.TestCase):
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

    def _student_bearer_headers(self) -> dict[str, str]:
        token, _ = issue_mobile_access_token(STUDENT_USER)
        return {"Authorization": f"Bearer {token}", "X-Client-Platform": "mobile"}

    def _psychologist_bearer_headers(self) -> dict[str, str]:
        token, _ = issue_mobile_access_token(PSYCHOLOGIST_USER)
        return {"Authorization": f"Bearer {token}", "X-Client-Platform": "mobile"}

    @patch("app.services.auth_service.find_user_by_id")
    def test_student_is_forbidden_from_psychologist_only_endpoints(self, mock_find_user):
        mock_find_user.return_value = STUDENT_USER
        headers = self._student_bearer_headers()

        self.assertEqual(self.client.get("/students", headers=headers).status_code, 403)
        self.assertEqual(self.client.post("/availabilities", json={}, headers=headers).status_code, 403)
        self.assertEqual(self.client.post("/availabilities/1/cancel", json={}, headers=headers).status_code, 403)
        self.assertEqual(self.client.post("/availabilities/1/rehabilitate", headers=headers).status_code, 403)
        self.assertEqual(self.client.post("/disabled-schedules", json={}, headers=headers).status_code, 403)
        self.assertEqual(self.client.post("/disabled-schedules/check-conflicts", json={}, headers=headers).status_code, 403)
        self.assertEqual(self.client.put("/disabled-schedules/1", json={}, headers=headers).status_code, 403)
        self.assertEqual(self.client.delete("/disabled-schedules/1", headers=headers).status_code, 403)
        self.assertEqual(self.client.put("/regular-schedule", json={}, headers=headers).status_code, 403)
        self.assertEqual(self.client.get("/db", headers=headers).status_code, 403)

    @patch("app.routes.availability.list_availabilities")
    @patch("app.services.auth_service.find_user_by_id")
    def test_availabilities_redacts_private_fields_and_hides_cancelled_for_students(
        self, mock_find_user, mock_list_avail
    ):
        mock_list_avail.return_value = [
            (
                101, date(2026, 11, 25), time(9, 0), time(10, 0), 60, 0,
                "Reservado", datetime(2026, 11, 19, tzinfo=timezone.utc),
                "Ana Lopez", "AL", 21, "6to", "ISC", "Ansiedad por exámenes",
                "Presencial", "Cubículo 2B", "PSI-101",
                None, None, None, None, None, "psicologo",
            ),
            (
                102, date(2026, 11, 25), time(11, 0), time(12, 0), 60, 0,
                "Cancelado", datetime(2026, 11, 19, tzinfo=timezone.utc),
                "Carlos Mendez", "CM", 20, "4to", "ISC", "Motivo privado",
                "Presencial", "Cubículo 2B", "PSI-102",
                None, None, None, "Enfermedad", "Observación privada", "alumno",
            ),
        ]

        # 1. Student request -> private fields stripped & 'Cancelado' slot filtered out
        mock_find_user.return_value = STUDENT_USER
        res_student = self.client.get("/availabilities", headers=self._student_bearer_headers())
        self.assertEqual(res_student.status_code, 200)
        student_payload = res_student.get_json()
        self.assertEqual(len(student_payload), 1)
        self.assertEqual(student_payload[0]["id"], 101)
        self.assertNotIn("studentName", student_payload[0])
        self.assertNotIn("consultationReason", student_payload[0])
        self.assertNotIn("folio", student_payload[0])

        # 2. Psychologist request -> full clinical/appointment details visible, including Cancelled
        mock_find_user.return_value = PSYCHOLOGIST_USER
        res_psych = self.client.get("/availabilities", headers=self._psychologist_bearer_headers())
        self.assertEqual(res_psych.status_code, 200)
        psych_payload = res_psych.get_json()
        self.assertEqual(len(psych_payload), 2)
        self.assertEqual(psych_payload[0]["studentName"], "Ana Lopez")
        self.assertEqual(psych_payload[0]["consultationReason"], "Ansiedad por exámenes")

    @patch("app.routes.availability.rehabilitate_cancelled_availability", return_value=True)
    @patch("app.routes.availability.cancel_appointment", return_value=True)
    @patch("app.routes.availability.register_availability")
    @patch("app.services.auth_service.find_user_by_id")
    def test_psychologist_availability_create_cancel_and_rehabilitate_flow_with_cookie_csrf(
        self, mock_find_user, mock_reg_avail, mock_cancel, mock_rehab
    ):
        mock_find_user.return_value = PSYCHOLOGIST_USER
        mock_reg_avail.return_value = (
            55, date(2026, 11, 26), time(8, 0), time(9, 0), 60, 0,
            "Disponible", datetime(2026, 11, 19, tzinfo=timezone.utc),
        )

        with self.client.session_transaction() as sess:
            sess["user_id"] = 1
            sess["role"] = "psicologo"
            sess["csrf_token"] = "csrf_psych_token_777"

        csrf_headers = {
            "Origin": "https://psigestor-web-staging.onrender.com",
            "X-CSRF-Token": "csrf_psych_token_777",
        }

        # 1. Create manual availability
        create_res = self.client.post(
            "/availabilities",
            json={
                "date": "2026-11-26",
                "startTime": "08:00",
                "endTime": "09:00",
                "duration": 60,
                "breakTime": 0,
            },
            headers=csrf_headers,
        )
        self.assertEqual(create_res.status_code, 201)
        self.assertEqual(create_res.get_json()["id"], 55)

        # 2. Cancel appointment on availability
        cancel_res = self.client.post(
            "/availabilities/55/cancel",
            json={"reason": "Fuerza mayor", "observation": "Reunión académica"},
            headers=csrf_headers,
        )
        self.assertEqual(cancel_res.status_code, 200)
        mock_cancel.assert_called_once_with(55, "Fuerza mayor", "Reunión académica")

        # 3. Rehabilitate cancelled availability
        rehab_res = self.client.post("/availabilities/55/rehabilitate", headers=csrf_headers)
        self.assertEqual(rehab_res.status_code, 200)
        mock_rehab.assert_called_once_with(55, 1)

    @patch("app.routes.appointments.approve_student_reschedule")
    @patch("app.routes.appointments.cancel_student_appointment")
    @patch("app.routes.appointments.request_student_reschedule")
    @patch("app.routes.appointments.get_student_appointments")
    @patch("app.routes.appointments.book_student_appointment")
    @patch("app.services.auth_service.find_user_by_id")
    def test_student_appointment_booking_reschedule_and_cancel_flow(
        self,
        mock_find_user,
        mock_book,
        mock_get_my,
        mock_req_resched,
        mock_cancel_apt,
        mock_approve_resched,
    ):
        mock_find_user.return_value = STUDENT_USER
        headers = self._student_bearer_headers()

        mock_book.return_value = (
            88, 7, "Estudiante Prueba", date(2026, 11, 27),
            time(10, 0), time(11, 0), 60, "In person",
            "Cubículo 2B", None, "Orientación vocacional",
            "Reserved", datetime(2026, 11, 19, tzinfo=timezone.utc),
        )

        # 1. Book appointment
        book_res = self.client.post(
            "/appointments/book",
            json={"availability_id": 55, "reason": "Orientación vocacional", "modality": "Presencial"},
            headers=headers,
        )
        self.assertEqual(book_res.status_code, 201)
        self.assertEqual(book_res.get_json()["appointment"]["id"], 88)

        # 2. List my appointments
        mock_get_my.return_value = [
            {
                "id": 88,
                "student_id": 7,
                "student_name": "Estudiante Prueba",
                "date": date(2026, 11, 27),
                "start_time": time(10, 0),
                "end_time": time(11, 0),
                "status": "Reserved",
                "created_at": datetime(2026, 11, 19, tzinfo=timezone.utc),
            }
        ]
        my_res = self.client.get("/appointments/my", headers=headers)
        self.assertEqual(my_res.status_code, 200)
        self.assertEqual(len(my_res.get_json()["appointments"]), 1)

        # 3. Request reschedule
        resched_res = self.client.post(
            "/appointments/88/reschedule-request",
            json={"proposed_availability_id": 60, "reason": "Examen parcial"},
            headers=headers,
        )
        self.assertEqual(resched_res.status_code, 200)
        mock_req_resched.assert_called_once()

        # 4. Approve reschedule
        approve_res = self.client.post("/appointments/88/approve-reschedule", headers=headers)
        self.assertEqual(approve_res.status_code, 200)
        mock_approve_resched.assert_called_once_with(88)

        # 5. Cancel appointment
        cancel_res = self.client.post(
            "/appointments/88/cancel",
            json={"reason": "Imprevisto familiar"},
            headers=headers,
        )
        self.assertEqual(cancel_res.status_code, 200)
        mock_cancel_apt.assert_called_once()


if __name__ == "__main__":
    unittest.main()
