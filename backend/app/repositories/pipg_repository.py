
from psycopg.types.json import Jsonb

from app.repositories.appointment_repository import get_db_connection

def _assessment_to_dict(row):
    if not row:
        return None

    return {
        "id": row[0],
        "studentId": row[1],
        "status": row[2],
        "answers": row[3],
        "directScores": row[4],
        "percentileScores": row[5],
        "startedAt": row[6].isoformat() if row[6] else None,
        "completedAt": row[7].isoformat() if row[7] else None,
        "createdAt": row[8].isoformat() if row[8] else None,
        "updatedAt": row[9].isoformat() if row[9] else None,
    }


def get_assessment_by_student(student_id: int):
    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    student_id,
                    status,
                    answers,
                    direct_scores,
                    percentile_scores,
                    started_at,
                    completed_at,
                    created_at,
                    updated_at
                FROM pipg_assessments
                WHERE student_id = %s;
                """,
                (student_id,)
            )

            return _assessment_to_dict(cursor.fetchone())

    finally:
        connection.close()


def create_assessment(student_id: int):
    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO pipg_assessments (student_id)
                VALUES (%s)
                ON CONFLICT (student_id) DO NOTHING
                RETURNING
                    id, student_id, status, answers,
                    direct_scores, percentile_scores,
                    started_at, completed_at, created_at, updated_at;
                """,
                (student_id,)
            )

            row = cursor.fetchone()

            if not row:
                cursor.execute(
                    """
                    SELECT
                        id, student_id, status, answers,
                        direct_scores, percentile_scores,
                        started_at, completed_at, created_at, updated_at
                    FROM pipg_assessments
                    WHERE student_id = %s;
                    """,
                    (student_id,)
                )
                row = cursor.fetchone()

            connection.commit()
            return _assessment_to_dict(row)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def save_assessment_answers(student_id: int, answers: dict):
    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE pipg_assessments
                SET
                    answers = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE student_id = %s
                  AND status = 'in_progress'
                RETURNING
                    id, student_id, status, answers,
                    direct_scores, percentile_scores,
                    started_at, completed_at, created_at, updated_at;
                """,
                (Jsonb(answers), student_id)
            )

            row = cursor.fetchone()

            if not row:
                raise ValueError(
                    "No existe una evaluación pendiente para este alumno."
                )

            connection.commit()
            return _assessment_to_dict(row)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def complete_assessment(
    student_id: int,
    answers: dict,
    direct_scores: dict,
    percentile_scores: dict
):
    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE pipg_assessments
                SET
                    answers = %s,
                    direct_scores = %s,
                    percentile_scores = %s,
                    status = 'completed',
                    completed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE student_id = %s
                  AND status = 'in_progress'
                RETURNING
                    id, student_id, status, answers,
                    direct_scores, percentile_scores,
                    started_at, completed_at, created_at, updated_at;
                """,
                (
    Jsonb(answers),
    Jsonb(direct_scores),
    Jsonb(percentile_scores),
    student_id
)
            )

            row = cursor.fetchone()

            if not row:
                raise ValueError(
                    "No existe una evaluación pendiente para completar."
                )

            connection.commit()
            return _assessment_to_dict(row)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def get_all_completed_assessments():
    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    a.id,
                    a.student_id,
                    a.status,
                    a.answers,
                    a.direct_scores,
                    a.percentile_scores,
                    a.started_at,
                    a.completed_at,
                    a.created_at,
                    a.updated_at,
                    s.student_id AS student_code,
                    s.name AS student_name,
                    s.program,
                    s.semester
                FROM pipg_assessments a
                INNER JOIN students s ON s.id = a.student_id
                WHERE a.status = 'completed'
                ORDER BY a.completed_at DESC;
                """
            )

            rows = cursor.fetchall()

            results = []

            for row in rows:
                assessment = _assessment_to_dict(row[:10])
                assessment.update({
                    "studentCode": row[10],
                    "studentName": row[11],
                    "program": row[12],
                    "semester": row[13],
                })
                results.append(assessment)

            return results

    finally:
        connection.close()
