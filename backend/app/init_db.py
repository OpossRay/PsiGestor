from datetime import datetime
import hashlib
import os
from pathlib import Path
import sys
import time

from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

from app.config import get_app_env, is_production, is_production_like, is_staging
from app.database import get_db_connection
from app.services.regular_schedule_service import (
    LOCAL_TIMEZONE,
    calculate_generation_end_date,
    get_regular_schedule_config,
)
from app.services.availability_generation_service import (
    generate_slots_for_range,
)
from app.repositories.generated_availability_repository import (
    replace_generated_availabilities,
)


load_dotenv()

MIGRATION_ADVISORY_LOCK_KEY = 7392045112840195

FORBIDDEN_DEMO_PASSWORDS = frozenset({
    "password123",
    "password",
    "123456",
    "12345678",
    "psicestor",
    "psigestor",
    "psicestor_password",
    "psigestor_password",
    "admin",
    "admin123",
})


class MigrationError(RuntimeError):
    """Base error for database migration failures."""


class MigrationChecksumMismatchError(MigrationError):
    """Raised when an already applied migration file has a modified checksum."""


class SchemaAdoptionError(MigrationError):
    """Raised when an existing database has a partial or incompatible schema state."""


class ResetForbiddenError(MigrationError):
    """Raised when --reset is invoked outside local development."""


# Complete structural signatures for every migration (tables, columns, constraints, indexes)
MIGRATION_SIGNATURES: dict[str, dict] = {
    "001_create_availabilities.sql": {
        "kind": "create_table",
        "tables": {"availabilities"},
        "columns": {
            "availabilities": {
                "id", "date", "start_time", "end_time", "duration", "break_time",
                "status", "student_name", "student_initials", "student_age",
                "student_semester", "student_program", "consultation_reason",
                "modality", "location", "folio", "proposed_date",
                "proposed_start_time", "proposed_end_time",
                "cancellation_reason", "cancellation_observation", "created_at",
            }
        },
        "constraints": {
            "availabilities": {"availabilities_status_check"},
        },
        "indexes": set(),
    },
    "002_create_regular_schedule.sql": {
        "kind": "create_table",
        "tables": {"regular_schedule", "regular_schedule_days"},
        "columns": {
            "regular_schedule": {
                "id", "appointment_duration", "appointment_gap_minutes",
                "break_enabled", "break_start_time", "break_end_time",
                "created_at", "updated_at",
            },
            "regular_schedule_days": {
                "id", "regular_schedule_id", "day_of_week",
                "start_time", "end_time", "created_at", "updated_at",
            },
        },
        "constraints": {
            "regular_schedule": {
                "regular_schedule_singleton",
                "regular_schedule_duration_positive",
                "regular_schedule_gap_non_negative",
                "regular_schedule_break_valid",
            },
            "regular_schedule_days": {
                "fk_regular_schedule",
                "regular_schedule_day_valid",
                "regular_schedule_day_time_valid",
                "regular_schedule_day_unique",
            },
        },
        "indexes": set(),
    },
    "003_add_availability_source.sql": {
        "kind": "alter_table",
        "required_tables": {"availabilities", "regular_schedule"},
        "marker_columns": {
            "availabilities": {"source", "regular_schedule_id"},
        },
        "columns": {
            "availabilities": {"source", "regular_schedule_id"},
        },
        "constraints": {
            "availabilities": {
                "availabilities_source_check",
                "fk_availability_regular_schedule",
            },
        },
        "indexes": {"idx_availabilities_source_date_status"},
    },
    "004_add_availability_range_to_regular_schedule.sql": {
        "kind": "alter_table",
        "required_tables": {"regular_schedule"},
        "marker_columns": {
            "regular_schedule": {"availability_range_value", "availability_range_unit"},
        },
        "columns": {
            "regular_schedule": {"availability_range_value", "availability_range_unit"},
        },
        "constraints": {
            "regular_schedule": {"regular_schedule_availability_range_valid"},
        },
        "indexes": set(),
    },
    "004_create_disabled_schedules.sql": {
        "kind": "create_table",
        "tables": {"disabled_schedules"},
        "columns": {
            "disabled_schedules": {
                "id", "start_date", "end_date", "start_time", "end_time",
                "reason", "observation", "type", "status", "created_at",
            }
        },
        "constraints": {},
        "indexes": set(),
    },
    "005_add_availability_appointment_fields.sql": {
        "kind": "ensure_columns",
        "required_tables": {"availabilities"},
        "columns": {
            "availabilities": {
                "student_name", "student_initials", "student_age",
                "student_semester", "student_program", "consultation_reason",
                "modality", "location", "folio", "proposed_date",
                "proposed_start_time", "proposed_end_time",
                "cancellation_reason", "cancellation_observation",
            }
        },
        "constraints": {
            "availabilities": {"availabilities_status_check"},
        },
        "indexes": set(),
    },
    "006_create_students.sql": {
        "kind": "create_table",
        "tables": {"students"},
        "columns": {
            "students": {"id", "student_id", "name", "program", "semester"},
        },
        "constraints": {},
        "indexes": set(),
    },
    "007_create_appointments.sql": {
        "kind": "create_table",
        "tables": {"appointments"},
        "columns": {
            "appointments": {
                "id", "student_id", "student_name", "date",
                "start_time", "end_time", "duration", "modality",
                "location", "meeting_url", "reason", "status", "created_at",
            }
        },
        "constraints": {
            "appointments": {
                "appointments_modality_check",
                "appointments_status_check",
            },
        },
        "indexes": set(),
    },
    "008_create_users.sql": {
        "kind": "create_table",
        "tables": {"users"},
        "columns": {
            "users": {
                "id", "email", "password_hash", "name",
                "role", "student_id", "is_active", "created_at",
            }
        },
        "constraints": {
            "users": {"users_role_check", "fk_users_student"},
        },
        "indexes": {
            "unique_single_active_psicologo",
            "idx_users_email",
            "unique_active_student_user",
        },
    },
    "009_update_appointments_reschedule_cancel.sql": {
        "kind": "alter_table",
        "required_tables": {"appointments"},
        "marker_columns": {
            "appointments": {
                "cancellation_reason", "cancelled_at", "reschedule_reason",
                "rescheduled_at", "proposed_date", "proposed_start_time",
                "proposed_end_time", "proposed_availability_id", "user_id",
            }
        },
        "columns": {
            "appointments": {
                "cancellation_reason", "cancelled_at", "reschedule_reason",
                "rescheduled_at", "proposed_date", "proposed_start_time",
                "proposed_end_time", "proposed_availability_id", "user_id",
            }
        },
        "constraints": {
            "appointments": {"appointments_status_check"},
        },
        "constraint_substrings": {
            ("appointments", "appointments_status_check"): "Pending Reschedule",
        },
        "indexes": {
            "idx_appointments_student_id",
            "idx_appointments_user_id",
        },
    },
    "010_add_reschedule_requested_by.sql": {
        "kind": "alter_table",
        "required_tables": {"appointments", "availabilities"},
        "marker_columns": {
            "appointments": {"reschedule_requested_by"},
            "availabilities": {"reschedule_requested_by"},
        },
        "columns": {
            "appointments": {"reschedule_requested_by"},
            "availabilities": {"reschedule_requested_by"},
        },
        "constraints": {},
        "indexes": set(),
    },
    "011_add_appointment_cancellation_audit.sql": {
        "kind": "alter_table",
        "required_tables": {"appointments"},
        "marker_columns": {
            "appointments": {
                "cancellation_observation", "cancelled_by",
                "rehabilitated_at", "rehabilitated_by",
            }
        },
        "columns": {
            "appointments": {
                "cancellation_observation", "cancelled_by",
                "rehabilitated_at", "rehabilitated_by",
            }
        },
        "constraints": {},
        "indexes": set(),
    },
    "012_create_auth_refresh_tokens.sql": {
        "kind": "create_table",
        "tables": {"auth_refresh_tokens", "auth_rate_limits"},
        "columns": {
            "auth_refresh_tokens": {
                "id", "user_id", "token_hash", "family_id",
                "device_hint", "expires_at", "revoked_at",
                "replaced_by_hash", "created_at",
            },
            "auth_rate_limits": {
                "id", "rate_key", "attempted_at",
            },
        },
        "constraints": {
            "auth_refresh_tokens": {"fk_refresh_tokens_user"},
        },
        "indexes": {
            "idx_refresh_tokens_user_id",
            "idx_refresh_tokens_family_id",
            "idx_auth_rate_limits_key_time",
            "idx_auth_rate_limits_attempted_at",
        },
    },
}


def compute_migration_checksum(sql_text: str) -> str:
    """Computes normalized SHA-256 checksum across CRLF/LF line endings."""
    normalized = sql_text.replace("\r\n", "\n").replace("\r", "\n").strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def get_database_dir() -> Path:
    docker_path = Path("/database")
    if docker_path.exists():
        return docker_path

    repo_root = Path(__file__).resolve().parents[2]
    return repo_root / "database"


def connect_with_retry(max_retries: int = 15, delay_seconds: float = 1.0):
    last_error = None
    for _ in range(max_retries):
        try:
            return get_db_connection()
        except RuntimeError:
            # Configuration / forbidden password error should fail immediately
            raise
        except Exception as error:
            last_error = error
            time.sleep(delay_seconds)
    raise RuntimeError(
        f"No se pudo conectar a PostgreSQL después de {max_retries} intentos: {last_error}"
    )


def _fetch_existing_schema_metadata(cursor) -> dict:
    """
    Queries PostgreSQL catalog for public tables, columns, constraints (with definitions),
    and indexes to perform thorough migration adoption verification.
    """
    cursor.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        """
    )
    tables = {row[0] for row in cursor.fetchall()}

    cursor.execute(
        """
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public';
        """
    )
    columns: dict[str, set[str]] = {}
    for tbl, col in cursor.fetchall():
        columns.setdefault(tbl, set()).add(col)

    cursor.execute(
        """
        SELECT rel.relname AS table_name, con.conname AS constraint_name, pg_get_constraintdef(con.oid) AS con_def
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public';
        """
    )
    constraints: dict[str, set[str]] = {}
    constraint_defs: dict[tuple[str, str], str] = {}
    for tbl, con_name, con_def in cursor.fetchall():
        constraints.setdefault(tbl, set()).add(con_name)
        constraint_defs[(tbl, con_name)] = con_def or ""

    cursor.execute(
        """
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public';
        """
    )
    indexes = {row[0] for row in cursor.fetchall()}

    return {
        "tables": tables,
        "columns": columns,
        "constraints": constraints,
        "constraint_defs": constraint_defs,
        "indexes": indexes,
    }


def evaluate_migration_adoption_state(
    version: str,
    schema_meta: dict,
    previously_adopted_or_applied: set[str],
) -> str:
    """
    Evaluates whether an unrecorded migration is:
    - 'NOT_APPLIED': none of its structural artifacts exist yet.
    - 'FULLY_APPLIED': all tables, columns, constraints, and indexes match 100%.
    Raises SchemaAdoptionError if a partial or incompatible structure is detected.
    """
    spec = MIGRATION_SIGNATURES.get(version)
    if not spec:
        return "NOT_APPLIED"

    existing_tables: set[str] = schema_meta["tables"]
    existing_cols: dict[str, set[str]] = schema_meta["columns"]
    existing_cons: dict[str, set[str]] = schema_meta["constraints"]
    existing_con_defs: dict[tuple[str, str], str] = schema_meta["constraint_defs"]
    existing_indexes: set[str] = schema_meta["indexes"]

    kind = spec["kind"]

    if kind == "create_table":
        target_tables: set[str] = spec["tables"]
        present_tables = target_tables & existing_tables
        if not present_tables:
            return "NOT_APPLIED"

        if present_tables != target_tables:
            missing_tbls = sorted(target_tables - present_tables)
            raise SchemaAdoptionError(
                f"Estado parcial detectado en migración '{version}': "
                f"existen tablas {sorted(present_tables)} pero faltan {missing_tbls}. "
                "Intervención manual requerida."
            )

    elif kind == "alter_table":
        required_tables: set[str] = spec["required_tables"]
        if not required_tables.issubset(existing_tables):
            return "NOT_APPLIED"

        marker_cols: dict[str, set[str]] = spec["marker_columns"]
        total_markers = 0
        present_markers = 0
        for tbl, cols in marker_cols.items():
            tbl_cols = existing_cols.get(tbl, set())
            for c in cols:
                total_markers += 1
                if c in tbl_cols:
                    present_markers += 1

        present_idx = spec.get("indexes", set()) & existing_indexes

        if present_markers == 0 and not present_idx:
            return "NOT_APPLIED"

        if present_markers < total_markers:
            raise SchemaAdoptionError(
                f"Estructura parcial o incompatible en migración '{version}': "
                f"solo {present_markers}/{total_markers} columnas esperadas existen. "
                "Intervención manual requerida."
            )

    elif kind == "ensure_columns":
        # Migration 005 shares columns with 001; only adopt if 001 is already applied/adopted
        # and all 004 migrations have been processed
        required_prereqs = {
            "001_create_availabilities.sql",
            "004_add_availability_range_to_regular_schedule.sql",
            "004_create_disabled_schedules.sql",
        }
        if not required_prereqs.issubset(previously_adopted_or_applied):
            return "NOT_APPLIED"

    # Full verification of all columns, constraints, constraint definitions, and indexes
    missing_details: list[str] = []

    for tbl, req_cols in spec.get("columns", {}).items():
        actual_cols = existing_cols.get(tbl, set())
        missing_c = sorted(req_cols - actual_cols)
        if missing_c:
            missing_details.append(f"columnas faltantes en '{tbl}': {missing_c}")

    for tbl, req_cons in spec.get("constraints", {}).items():
        actual_cons = existing_cons.get(tbl, set())
        missing_con = sorted(req_cons - actual_cons)
        if missing_con:
            missing_details.append(f"constraints faltantes en '{tbl}': {missing_con}")

    for (tbl, con_name), expected_sub in spec.get("constraint_substrings", {}).items():
        actual_def = existing_con_defs.get((tbl, con_name), "")
        if expected_sub not in actual_def:
            missing_details.append(
                f"constraint '{tbl}.{con_name}' no contiene '{expected_sub}' (definición actual: '{actual_def}')"
            )

    req_indexes: set[str] = spec.get("indexes", set())
    missing_idx = sorted(req_indexes - existing_indexes)
    if missing_idx:
        missing_details.append(f"índices faltantes: {missing_idx}")

    if missing_details:
        raise SchemaAdoptionError(
            f"Estructura parcial o incompatible detectada al verificar '{version}': "
            + "; ".join(missing_details)
            + ". Se detiene el proceso para evitar corrupción de datos."
        )

    return "FULLY_APPLIED"


def ensure_schema_migrations_table(cursor) -> dict[str, str]:
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(255) PRIMARY KEY,
            checksum VARCHAR(64) NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    cursor.execute("SELECT version, checksum FROM schema_migrations ORDER BY version;")
    return {row[0]: row[1] for row in cursor.fetchall()}


def run_migrations(connection, migrations_dir: Path) -> list[str]:
    """
    Executes or adopts migrations in deterministic alphabetical order.
    Verifies checksums for already applied migrations and stops immediately on mismatch.
    Uses transaction boundaries for each migration.
    """
    migration_files = sorted(migrations_dir.glob("*.sql"))
    executed_or_adopted: list[str] = []

    with connection.cursor() as cursor:
        applied_map = ensure_schema_migrations_table(cursor)
        connection.commit()

        # 1. Verify checksums of all previously recorded migrations first
        files_by_name = {mf.name: mf for mf in migration_files}
        for version, recorded_checksum in applied_map.items():
            if version in files_by_name:
                current_sql = files_by_name[version].read_text(encoding="utf-8")
                current_checksum = compute_migration_checksum(current_sql)
                if current_checksum != recorded_checksum:
                    raise MigrationChecksumMismatchError(
                        f"CRITICAL: El checksum de la migración ya aplicada '{version}' cambió. "
                        f"Registrado: {recorded_checksum} | Actual: {current_checksum}. "
                        "Proceso detenido para proteger la integridad de la base de datos."
                    )

        # 2. Check if database already had tables before schema_migrations existed
        schema_meta = _fetch_existing_schema_metadata(cursor)
        has_preexisting_domain_tables = bool(
            schema_meta["tables"] - {"schema_migrations"}
        )
        known_complete: set[str] = set(applied_map.keys())

        for migration_file in migration_files:
            version = migration_file.name
            sql_content = migration_file.read_text(encoding="utf-8")
            checksum = compute_migration_checksum(sql_content)

            if version in applied_map:
                known_complete.add(version)
                continue

            if has_preexisting_domain_tables:
                schema_meta = _fetch_existing_schema_metadata(cursor)
                adoption_state = evaluate_migration_adoption_state(
                    version,
                    schema_meta,
                    known_complete,
                )
                if adoption_state == "FULLY_APPLIED":
                    cursor.execute(
                        """
                        INSERT INTO schema_migrations (version, checksum)
                        VALUES (%s, %s);
                        """,
                        (version, checksum),
                    )
                    connection.commit()
                    known_complete.add(version)
                    executed_or_adopted.append(f"adopted:{version}")
                    print(f"[init_db] Migración existente verificada y adoptada: {version}")
                    continue

            # Execute pending migration atomically
            try:
                cursor.execute(sql_content)
                cursor.execute(
                    """
                    INSERT INTO schema_migrations (version, checksum)
                    VALUES (%s, %s);
                    """,
                    (version, checksum),
                )
                connection.commit()
                known_complete.add(version)
                executed_or_adopted.append(f"applied:{version}")
                print(f"[init_db] Migración aplicada: {version}")
            except Exception:
                connection.rollback()
                raise

    return executed_or_adopted


def should_load_demo_seeds() -> bool:
    """
    Production NEVER loads test/demo seeds.
    Staging ONLY loads test seeds if ALLOW_STAGING_SEEDS=true is explicitly set.
    Development loads demo seeds by default unless SEED_DEMO_DATA=false.
    """
    if is_production():
        return False
    if is_staging():
        return os.getenv("ALLOW_STAGING_SEEDS", "false").strip().lower() == "true"
    return os.getenv("SEED_DEMO_DATA", "true").strip().lower() != "false"


def bootstrap_initial_psychologist_if_configured(cursor) -> bool:
    """
    Safe procedure to provision the initial psychologist account in staging/production
    using environment variables INITIAL_PSYCHOLOGIST_EMAIL and INITIAL_PSYCHOLOGIST_PASSWORD.
    Rejects demonstration or weak passwords in production.
    """
    email = (os.getenv("INITIAL_PSYCHOLOGIST_EMAIL") or "").strip().lower()
    password = os.getenv("INITIAL_PSYCHOLOGIST_PASSWORD") or ""
    name = (os.getenv("INITIAL_PSYCHOLOGIST_NAME") or "Lic. Psicología ITESCAM").strip()

    if not email or not password:
        return False

    if is_production_like():
        if password.strip().lower() in FORBIDDEN_DEMO_PASSWORDS or len(password) < 10:
            raise MigrationError(
                "CRITICAL: INITIAL_PSYCHOLOGIST_PASSWORD uses a forbidden demo password or has fewer than 10 characters."
            )

    cursor.execute("SELECT 1 FROM users WHERE role = 'psicologo' AND is_active = TRUE;")
    if cursor.fetchone() is not None:
        return False

    password_hash = generate_password_hash(password)
    cursor.execute(
        """
        INSERT INTO users (email, password_hash, name, role, is_active)
        VALUES (%s, %s, %s, 'psicologo', TRUE)
        ON CONFLICT (email) DO NOTHING;
        """,
        (email, password_hash, name),
    )
    return True


def sync_regular_schedule_availabilities() -> None:
    saved_schedule = get_regular_schedule_config()
    if saved_schedule is None:
        return

    range_value = saved_schedule.get("availabilityRangeValue")
    range_unit = saved_schedule.get("availabilityRangeUnit")

    if range_value is None or range_unit is None:
        print(
            "[init_db] El horario habitual no tiene "
            "un rango de disponibilidad configurado."
        )
        return

    start_date = datetime.now(LOCAL_TIMEZONE).date()
    end_date = calculate_generation_end_date(
        start_date,
        range_value,
        range_unit,
    )
    generated_slots = generate_slots_for_range(
        saved_schedule,
        start_date,
        end_date,
    )
    replace_generated_availabilities(
        start_date,
        end_date,
        generated_slots,
        saved_schedule["id"],
    )


def run_seeds(connection, seeds_dir: Path, reset: bool = False) -> None:
    with connection.cursor() as cursor:
        if bootstrap_initial_psychologist_if_configured(cursor):
            connection.commit()
            print("[init_db] Cuenta inicial del psicólogo creada desde configuración segura.")

        if not should_load_demo_seeds():
            print(f"[init_db] Semillas de prueba omitidas en entorno '{get_app_env()}'.")
            return

        students_seed = seeds_dir / "001_students_test_data.sql"
        if students_seed.exists():
            cursor.execute(students_seed.read_text(encoding="utf-8"))
            connection.commit()

        psychologist_seed = seeds_dir / "003_psychologist_user.sql"
        if psychologist_seed.exists():
            cursor.execute(psychologist_seed.read_text(encoding="utf-8"))
            connection.commit()

        student_seed = seeds_dir / "004_student_user.sql"
        if student_seed.exists():
            cursor.execute(student_seed.read_text(encoding="utf-8"))
            connection.commit()

        cursor.execute("SELECT COUNT(*) FROM regular_schedule;")
        regular_schedule_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM availabilities;")
        availabilities_count = cursor.fetchone()[0]

        should_seed_calendar = (
            reset
            or regular_schedule_count == 0
            or availabilities_count == 0
        )

        if should_seed_calendar:
            calendar_seed = seeds_dir / "002_calendar_test_data.sql"
            if calendar_seed.exists():
                cursor.execute(calendar_seed.read_text(encoding="utf-8"))
                connection.commit()
                print("[init_db] Datos semilla del calendario aplicados (002_calendar_test_data.sql).")

    if should_seed_calendar:
        sync_regular_schedule_availabilities()
        print("[init_db] Disponibilidades generadas automáticamente para los próximos 90 días.")


def validate_reset_allowed(reset: bool) -> None:
    if not reset:
        return
    if is_production_like() or get_app_env() != "development":
        raise ResetForbiddenError(
            f"CRITICAL: La opción --reset está estrictamente bloqueada en el entorno '{get_app_env()}'."
        )
    if os.getenv("RENDER", "").strip().lower() == "true":
        raise ResetForbiddenError(
            "CRITICAL: La opción --reset está estrictamente bloqueada en Render."
        )


def verify_migrations_state(connection, migrations_dir: Path) -> dict:
    """
    Read-only inspection of migration state (--verify-only).
    Never modifies the database. Validates recorded checksums and reports pending migrations.
    """
    migration_files = sorted(migrations_dir.glob("*.sql"))
    files_by_name = {mf.name: mf for mf in migration_files}

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'schema_migrations'
            );
            """
        )
        has_table = bool(cursor.fetchone()[0])
        if not has_table:
            return {
                "applied": [],
                "pending": [mf.name for mf in migration_files],
            }

        cursor.execute("SELECT version, checksum FROM schema_migrations ORDER BY version;")
        applied_map = {row[0]: row[1] for row in cursor.fetchall()}

        for version, recorded_checksum in applied_map.items():
            if version in files_by_name:
                current_sql = files_by_name[version].read_text(encoding="utf-8")
                current_checksum = compute_migration_checksum(current_sql)
                if current_checksum != recorded_checksum:
                    raise MigrationChecksumMismatchError(
                        f"CRITICAL: El checksum de la migración ya aplicada '{version}' cambió. "
                        f"Registrado: {recorded_checksum} | Actual: {current_checksum}."
                    )

        pending = [mf.name for mf in migration_files if mf.name not in applied_map]
        return {
            "applied": sorted(applied_map.keys()),
            "pending": pending,
        }


def init_database(
    reset: bool = False,
    migrate_only: bool = False,
    verify_only: bool = False,
) -> dict:
    if reset and (migrate_only or verify_only):
        raise ValueError("No se puede combinar --reset con --migrate-only o --verify-only.")

    validate_reset_allowed(reset)

    db_dir = get_database_dir()
    migrations_dir = db_dir / "migrations"
    seeds_dir = db_dir / "seeds"

    if not migrations_dir.exists():
        print(f"[init_db] No se encontró el directorio de migraciones en {migrations_dir}")
        return {"status": "missing_migrations_dir"}

    connection = connect_with_retry()
    lock_acquired = False

    try:
        if verify_only:
            state = verify_migrations_state(connection, migrations_dir)
            if state["pending"]:
                raise MigrationError(
                    f"Verificación fallida (--verify-only): existen migraciones pendientes de aplicar: {state['pending']}"
                )
            print(
                f"[init_db] Verificación de solo lectura exitosa: {len(state['applied'])} migraciones aplicadas y checksums íntegros."
            )
            return {"status": "verified", **state}

        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_lock(%s);", (MIGRATION_ADVISORY_LOCK_KEY,))
            lock_acquired = True

        executed = run_migrations(connection, migrations_dir)

        if migrate_only:
            with connection.cursor() as cursor:
                if bootstrap_initial_psychologist_if_configured(cursor):
                    connection.commit()
                    print("[init_db] Cuenta inicial del psicólogo creada desde configuración segura.")
            print(f"[init_db] Ejecución controlada de migraciones (--migrate-only) completada: {len(executed)} cambios.")
            return {"status": "migrated", "changes": executed}

        if reset:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    TRUNCATE TABLE
                        auth_refresh_tokens,
                        auth_rate_limits,
                        appointments,
                        availabilities,
                        disabled_schedules,
                        regular_schedule_days,
                        regular_schedule,
                        users,
                        students
                    RESTART IDENTITY CASCADE;
                    """
                )
                connection.commit()
                print("[init_db] Tablas limpiadas correctamente (--reset en desarrollo local).")

        run_seeds(connection, seeds_dir, reset=reset)
        return {"status": "initialized", "changes": executed}

    except Exception as error:
        connection.rollback()
        print(f"[init_db] Error inicializando base de datos: {error}")
        raise
    finally:
        if lock_acquired:
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT pg_advisory_unlock(%s);", (MIGRATION_ADVISORY_LOCK_KEY,))
                connection.commit()
            except Exception:
                pass
        connection.close()


if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    migrate_only_flag = "--migrate-only" in sys.argv
    verify_only_flag = "--verify-only" in sys.argv

    init_database(
        reset=reset_flag,
        migrate_only=migrate_only_flag,
        verify_only=verify_only_flag,
    )
    if verify_only_flag:
        print("[init_db] Auditoría de migraciones (--verify-only) completada sin cambios.")
    elif migrate_only_flag:
        print("[init_db] Migraciones de esquema (--migrate-only) aplicadas correctamente.")
    elif reset_flag:
        print("[init_db] ¡Base de datos sincronizada al 100% con los datos semilla del equipo!")
    else:
        print("[init_db] Verificación de migraciones y semillas completada.")
