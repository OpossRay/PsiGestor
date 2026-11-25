import os
import sys
from pathlib import Path
from datetime import date, time, datetime, timezone, timedelta
import unittest
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ["SKIP_DB_INIT_ON_IMPORT"] = "true"

from app.app import create_app
from app.services.auth_service import issue_mobile_access_token

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


class TestPipgAppointmentRestriction(unittest.TestCase):
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

        with self.app.app_context():
            student_token, _ = issue_mobile_access_token(STUDENT_USER)
            psychologist_token, _ = issue_mobile_access_token(PSYCHOLOGIST_USER)

        self.student_headers = {
            "Authorization": f"Bearer {student_token}",
            "X-Client-Platform": "mobile",
            "Content-Type": "application/json",
        }
        self.psychologist_headers = {
            "Authorization": f"Bearer {psychologist_token}",
            "X-Client-Platform": "mobile",
            "Content-Type": "application/json",
        }

        # Future date and time for booking
        future_date = (date.today() + timedelta(days=7)).isoformat()
        self.booking_payload = {
            "date": future_date,
            "start_time": "10:00",
            "end_time": "11:00",
            "duration": 60,
            "modality": "Presencial",
            "reason": "Consulta de orientación vocacional",
        }

    def tearDown(self):
        self.env_patcher.stop()

    @patch("app.services.auth_service.find_user_by_id", return_value=STUDENT_USER)
    @patch("app.repositories.pipg_repository.get_assessment_by_student")
    def test_student_without_pipg_assessment_is_blocked_on_book(
        self, mock_get_assessment, mock_find_user
    ):
        # Alumno sin registro de evaluación P-IPG
        mock_get_assessment.return_value = None

        response = self.client.post(
            "/appointments/book",
            headers=self.student_headers,
            json=self.booking_payload,
        )

        self.assertEqual(response.status_code, 403)
        data = response.get_json()
        self.assertEqual(data.get("code"), "PIPG_REQUIRED")
        self.assertIn("Para poder solicitar una cita, primero debes completar", data.get("error"))

    @patch("app.services.auth_service.find_user_by_id", return_value=STUDENT_USER)
    @patch("app.repositories.pipg_repository.get_assessment_by_student")
    def test_student_with_in_progress_pipg_is_blocked_on_create_appointment(
        self, mock_get_assessment, mock_find_user
    ):
        # Alumno con evaluación en estado in_progress
        mock_get_assessment.return_value = {
            "id": 10,
            "studentId": 7,
            "status": "in_progress",
        }

        response = self.client.post(
            "/appointments",
            headers=self.student_headers,
            json=self.booking_payload,
        )

        self.assertEqual(response.status_code, 403)
        data = response.get_json()
        self.assertEqual(data.get("code"), "PIPG_REQUIRED")
        self.assertIn("Para poder solicitar una cita, primero debes completar", data.get("error"))

    @patch("app.services.auth_service.find_user_by_id", return_value=STUDENT_USER)
    @patch("app.services.appointment_service.create_appointment")
    @patch("app.repositories.pipg_repository.get_assessment_by_student")
    def test_student_with_completed_pipg_can_book_successfully(
        self, mock_get_assessment, mock_create_appointment, mock_find_user
    ):
        # Alumno con evaluación completada
        mock_get_assessment.return_value = {
            "id": 10,
            "studentId": 7,
            "status": "completed",
        }
        mock_create_appointment.return_value = (
            101,
            7,
            "Estudiante Prueba",
            date.today() + timedelta(days=7),
            time(10, 0),
            time(11, 0),
            60,
            "In person",
            "Cubículo 2B",
            None,
            "Consulta de orientación vocacional",
            "Reserved",
            datetime.now(timezone.utc),
        )

        response = self.client.post(
            "/appointments/book",
            headers=self.student_headers,
            json=self.booking_payload,
        )

        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertEqual(data.get("message"), "Cita confirmada y registrada correctamente.")

    @patch("app.services.auth_service.find_user_by_id", return_value=PSYCHOLOGIST_USER)
    @patch("app.services.appointment_service.create_appointment")
    @patch("app.repositories.pipg_repository.get_assessment_by_student")
    def test_psychologist_can_book_for_student_without_pipg_block(
        self, mock_get_assessment, mock_create_appointment, mock_find_user
    ):
        # La psicóloga no debe verse bloqueada por la restricción P-IPG
        mock_create_appointment.return_value = (
            102,
            7,
            "Estudiante Prueba",
            date.today() + timedelta(days=7),
            time(10, 0),
            time(11, 0),
            60,
            "In person",
            "Cubículo 2B",
            None,
            "Cita agendada por psicóloga",
            "Reserved",
            datetime.now(timezone.utc),
        )

        psychologist_payload = {
            **self.booking_payload,
            "student_id": 7,
            "student_name": "Estudiante Prueba",
        }

        response = self.client.post(
            "/appointments",
            headers=self.psychologist_headers,
            json=psychologist_payload,
        )

        self.assertEqual(response.status_code, 201)
        # El repositorio P-IPG no debió haber sido consultado para la psicóloga
        mock_get_assessment.assert_not_called()

    @patch("app.services.auth_service.find_user_by_id", return_value=STUDENT_USER)
    @patch("app.services.appointment_service.cancel_student_appointment_db")
    def test_student_cancellation_is_not_blocked_by_pipg(
        self, mock_cancel_db, mock_find_user
    ):
        # Cancelar citas existentes no debe estar restringido por P-IPG
        mock_cancel_db.return_value = True

        response = self.client.post(
            "/appointments/101/cancel",
            headers=self.student_headers,
            json={"reason": "Imprevisto académico"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("cancelada correctamente", response.get_json().get("message", ""))


if __name__ == "__main__":
    unittest.main()
