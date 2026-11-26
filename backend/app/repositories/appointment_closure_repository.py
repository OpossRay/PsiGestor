"""
El ID recibido corresponde siempre a appointments.id, nunca a availabilities.id.
"""
from datetime import datetime
from zoneinfo import ZoneInfo

from app.repositories.appointment_repository import get_db_connection

LOCAL_TZ = ZoneInfo("America/Merida")


def close_appointment_db(appointment_id: int, result: str, notes: str, psychologist_id: int):
    if result not in ("Attended", "NoShow"):
        raise ValueError("Debes seleccionar Atendida o No asistió.")
    if len(notes) > 600:
        raise ValueError("Las observaciones no pueden superar 600 caracteres.")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, date, end_time, status, closed_at
                FROM appointments
                WHERE id = %s
                FOR UPDATE;
                """,
                (appointment_id,)
            )
            row = cursor.fetchone()
            if row is None:
                raise LookupError("No se encontró la cita indicada.")

            _, appointment_date, end_time, status, closed_at = row
            if closed_at is not None:
                raise RuntimeError("Esta cita ya se cerró y no puede modificarse.")
            if status != "Reserved":
                raise RuntimeError("Solo se pueden cerrar citas reservadas y sin reprogramación pendiente.")

            session_end = datetime.combine(appointment_date, end_time, tzinfo=LOCAL_TZ)
            if session_end > datetime.now(LOCAL_TZ):
                raise RuntimeError("La cita aún no termina. No se puede cerrar anticipadamente.")

            cursor.execute(
                """
                UPDATE appointments
                SET attendance_result = %s,
                    closure_notes = %s,
                    closed_at = CURRENT_TIMESTAMP,
                    closed_by = %s
                WHERE id = %s AND closed_at IS NULL
                RETURNING id, attendance_result, closure_notes, closed_at, closed_by;
                """,
                (result, notes, psychologist_id, appointment_id)
            )
            saved = cursor.fetchone()
            if saved is None:
                raise RuntimeError("La cita ya no se encuentra disponible para cierre.")

        connection.commit()
        return {
            "id": saved[0],
            "status": "Closed",
            "attendance_result": saved[1],
            "closure_notes": saved[2] or "",
            "closed_at": saved[3].isoformat(),
            "closed_by": saved[4]
        }
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
