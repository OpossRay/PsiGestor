from datetime import datetime, timezone
import hashlib
from app.database import get_db_connection


class RefreshTokenError(ValueError):
    """Base error for refresh token validation failures."""


class InvalidRefreshTokenError(RefreshTokenError):
    """Raised when a refresh token does not exist or is malformed."""


class ExpiredRefreshTokenError(RefreshTokenError):
    """Raised when a refresh token is expired."""


class RefreshTokenReuseDetectedError(RefreshTokenError):
    """Raised when a rotated/revoked refresh token is reused (compromise detected)."""


def hash_refresh_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def store_refresh_token(
    user_id: int,
    token_hash: str,
    family_id: str,
    expires_at: datetime,
    device_hint: str | None = None,
) -> dict:
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO auth_refresh_tokens (
                    user_id,
                    token_hash,
                    family_id,
                    device_hint,
                    expires_at
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, user_id, family_id, expires_at, created_at;
                """,
                (user_id, token_hash, family_id, device_hint, expires_at),
            )
            row = cursor.fetchone()
            connection.commit()
            return {
                "id": row[0],
                "user_id": row[1],
                "family_id": row[2],
                "expires_at": row[3],
                "created_at": row[4],
            }
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def rotate_refresh_token_atomic(
    old_token_hash: str,
    new_token_hash: str,
    new_expires_at: datetime,
    device_hint: str | None = None,
) -> dict:
    """
    Atomically validates and rotates a refresh token using SELECT ... FOR UPDATE.
    If the token was already rotated or revoked, revokes the ENTIRE token family
    immediately and commits the revocation before raising RefreshTokenReuseDetectedError.
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    rt.id,
                    rt.user_id,
                    rt.family_id,
                    rt.expires_at,
                    rt.revoked_at,
                    rt.replaced_by_hash,
                    u.email,
                    u.name,
                    u.role,
                    u.student_id,
                    u.is_active,
                    u.created_at,
                    s.student_id AS student_code,
                    s.program,
                    s.semester
                FROM auth_refresh_tokens rt
                JOIN users u ON u.id = rt.user_id
                LEFT JOIN students s ON u.student_id = s.id
                WHERE rt.token_hash = %s
                FOR UPDATE OF rt;
                """,
                (old_token_hash,),
            )
            row = cursor.fetchone()
            if not row:
                connection.rollback()
                raise InvalidRefreshTokenError("Refresh token inválido o no registrado.")

            (
                token_id,
                user_id,
                family_id,
                expires_at,
                revoked_at,
                replaced_by_hash,
                email,
                name,
                role,
                student_id,
                is_active,
                user_created_at,
                student_code,
                program,
                semester,
            ) = row

            # 1. Reuse detection: token already rotated or revoked
            if replaced_by_hash is not None or revoked_at is not None:
                cursor.execute(
                    """
                    UPDATE auth_refresh_tokens
                    SET revoked_at = CURRENT_TIMESTAMP
                    WHERE family_id = %s AND revoked_at IS NULL;
                    """,
                    (family_id,),
                )
                connection.commit()
                raise RefreshTokenReuseDetectedError(
                    "Se detectó reutilización de un token de sesión. Por seguridad, todas las sesiones de esta familia han sido revocadas."
                )

            # 2. Check user active state
            if not is_active:
                cursor.execute(
                    """
                    UPDATE auth_refresh_tokens
                    SET revoked_at = CURRENT_TIMESTAMP
                    WHERE family_id = %s AND revoked_at IS NULL;
                    """,
                    (family_id,),
                )
                connection.commit()
                raise PermissionError(
                    "Esta cuenta ha sido desactivada. Consulta con administración."
                )

            # 3. Check expiration
            now_utc = datetime.now(timezone.utc)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            if expires_at <= now_utc:
                cursor.execute(
                    """
                    UPDATE auth_refresh_tokens
                    SET revoked_at = CURRENT_TIMESTAMP
                    WHERE id = %s AND revoked_at IS NULL;
                    """,
                    (token_id,),
                )
                connection.commit()
                raise ExpiredRefreshTokenError("La sesión móvil ha expirado. Inicia sesión nuevamente.")

            # 4. Atomic rotation: mark current token as replaced/revoked and insert new token
            cursor.execute(
                """
                UPDATE auth_refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP,
                    replaced_by_hash = %s
                WHERE id = %s;
                """,
                (new_token_hash, token_id),
            )

            cursor.execute(
                """
                INSERT INTO auth_refresh_tokens (
                    user_id,
                    token_hash,
                    family_id,
                    device_hint,
                    expires_at
                )
                VALUES (%s, %s, %s, %s, %s);
                """,
                (user_id, new_token_hash, family_id, device_hint, new_expires_at),
            )
            connection.commit()

            return {
                "id": user_id,
                "email": email,
                "name": name,
                "role": role,
                "student_id": student_id,
                "is_active": is_active,
                "created_at": user_created_at.isoformat() if user_created_at else None,
                "student_code": student_code,
                "program": program,
                "semester": semester,
                "family_id": family_id,
            }
    except (RefreshTokenError, PermissionError):
        raise
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def revoke_refresh_token_by_hash(token_hash: str) -> bool:
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE auth_refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE token_hash = %s AND revoked_at IS NULL
                RETURNING id;
                """,
                (token_hash,),
            )
            row = cursor.fetchone()
            connection.commit()
            return row is not None
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def revoke_all_user_refresh_tokens(user_id: int) -> int:
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE auth_refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE user_id = %s AND revoked_at IS NULL;
                """,
                (user_id,),
            )
            count = cursor.rowcount
            connection.commit()
            return count
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
