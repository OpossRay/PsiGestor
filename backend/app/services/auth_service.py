from datetime import datetime, timedelta, timezone
from functools import wraps
import os
import re
import secrets
import time
from urllib.parse import urlparse
import uuid

from flask import session, jsonify, request
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import generate_password_hash, check_password_hash

from app.config import (
    get_cors_allowed_origins,
    get_mobile_token_secret,
    is_production_like,
    is_strict_auth_enabled,
)
from app.repositories.refresh_token_repository import (
    ExpiredRefreshTokenError,
    InvalidRefreshTokenError,
    RefreshTokenError,
    RefreshTokenReuseDetectedError,
    hash_refresh_token,
    revoke_all_user_refresh_tokens,
    revoke_refresh_token_by_hash,
    rotate_refresh_token_atomic,
    store_refresh_token,
)
from app.repositories.user_repository import (
    find_user_by_email,
    find_user_by_id,
    find_student_by_code,
    find_user_by_student_db_id,
    create_student_user,
)

EMAIL_REGEX = re.compile(r"^[\w\.-]+@([\w\.-]+\.)+[a-zA-Z]{2,}$")
MOBILE_ACCESS_TOKEN_SALT = "psigestor-mobile-access-token-v1"
MUTATING_HTTP_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def get_mobile_access_token_ttl() -> int:
    return int(os.getenv("MOBILE_ACCESS_TOKEN_TTL_SECONDS", "900"))


def get_mobile_refresh_token_days() -> int:
    return int(os.getenv("MOBILE_REFRESH_TOKEN_TTL_DAYS", "14"))


def _get_mobile_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        secret_key=get_mobile_token_secret(),
        salt=MOBILE_ACCESS_TOKEN_SALT,
    )


def ensure_csrf_token() -> str:
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return token


def authenticate_user(email: str, password: str, establish_cookie_session: bool = True):
    if not email or not password:
        raise ValueError("Correo electrónico y contraseña requeridos.")

    user = find_user_by_email(email)
    if not user:
        raise ValueError("Credenciales incorrectas o usuario no encontrado.")

    if not user.get("is_active"):
        raise PermissionError("Esta cuenta ha sido desactivada. Consulta con administración.")

    if not check_password_hash(user["password_hash"], password):
        raise ValueError("Credenciales incorrectas o usuario no encontrado.")

    if establish_cookie_session:
        session.clear()
        session.permanent = True
        session["user_id"] = user["id"]
        session["role"] = user["role"]
        session["email"] = user["email"]
        session["csrf_token"] = secrets.token_urlsafe(32)

    return sanitize_user(user)


def issue_mobile_access_token(user: dict) -> tuple[str, int]:
    ttl_seconds = get_mobile_access_token_ttl()
    now_ts = int(time.time())
    payload = {
        "sub": int(user["id"]),
        "role": user["role"],
        "typ": "mobile_access",
        "jti": str(uuid.uuid4()),
        "iat": now_ts,
        "exp": now_ts + ttl_seconds,
    }
    token = _get_mobile_serializer().dumps(payload)
    return token, ttl_seconds


def verify_mobile_access_token(raw_token: str) -> dict | None:
    if not raw_token or not isinstance(raw_token, str):
        return None

    ttl_seconds = get_mobile_access_token_ttl()
    try:
        payload = _get_mobile_serializer().loads(raw_token, max_age=ttl_seconds)
    except (SignatureExpired, BadSignature):
        return None

    if not isinstance(payload, dict):
        return None

    if payload.get("typ") != "mobile_access":
        return None

    now_ts = int(time.time())
    exp_ts = payload.get("exp")
    user_id = payload.get("sub")

    if not isinstance(exp_ts, int) or exp_ts <= now_ts:
        return None

    if not isinstance(user_id, int) or user_id <= 0:
        return None

    user = find_user_by_id(user_id)
    if not user or not user.get("is_active"):
        return None

    return sanitize_user(user)


def issue_mobile_token_pair(user: dict, device_hint: str | None = None) -> dict:
    access_token, expires_in = issue_mobile_access_token(user)
    raw_refresh_token = secrets.token_urlsafe(48)
    token_hash = hash_refresh_token(raw_refresh_token)
    family_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=get_mobile_refresh_token_days())

    store_refresh_token(
        user_id=int(user["id"]),
        token_hash=token_hash,
        family_id=family_id,
        expires_at=expires_at,
        device_hint=device_hint,
    )

    return {
        "accessToken": access_token,
        "refreshToken": raw_refresh_token,
        "expiresIn": expires_in,
        "tokenType": "Bearer",
    }


def rotate_mobile_tokens(raw_refresh_token: str, device_hint: str | None = None) -> dict:
    if not raw_refresh_token or not isinstance(raw_refresh_token, str) or not raw_refresh_token.strip():
        raise InvalidRefreshTokenError("El refresh token es obligatorio.")

    old_hash = hash_refresh_token(raw_refresh_token.strip())
    new_raw_refresh = secrets.token_urlsafe(48)
    new_hash = hash_refresh_token(new_raw_refresh)
    new_expires_at = datetime.now(timezone.utc) + timedelta(days=get_mobile_refresh_token_days())

    updated_user = rotate_refresh_token_atomic(
        old_token_hash=old_hash,
        new_token_hash=new_hash,
        new_expires_at=new_expires_at,
        device_hint=device_hint,
    )
    sanitized = sanitize_user(updated_user)
    access_token, expires_in = issue_mobile_access_token(sanitized)

    return {
        "user": sanitized,
        "accessToken": access_token,
        "refreshToken": new_raw_refresh,
        "expiresIn": expires_in,
        "tokenType": "Bearer",
    }


def revoke_mobile_refresh_token(raw_refresh_token: str | None) -> bool:
    if not raw_refresh_token or not isinstance(raw_refresh_token, str) or not raw_refresh_token.strip():
        return False
    token_hash = hash_refresh_token(raw_refresh_token.strip())
    return revoke_refresh_token_by_hash(token_hash)


def revoke_all_user_sessions(user_id: int) -> int:
    return revoke_all_user_refresh_tokens(user_id)


def register_student(
    name: str,
    email: str,
    password: str,
    student_code: str,
    program: str = None,
    semester: int = None,
):
    if not name or not name.strip():
        raise ValueError("El nombre completo es obligatorio.")

    if not email or not EMAIL_REGEX.match(email.strip()):
        raise ValueError("El correo electrónico no tiene un formato válido.")

    if not password or len(password) < 6:
        raise ValueError("La contraseña debe tener al menos 6 caracteres.")

    if not student_code or not student_code.strip():
        raise ValueError("La matrícula es obligatoria.")

    existing_user = find_user_by_email(email.strip())
    if existing_user:
        raise ValueError("Ya existe una cuenta registrada con este correo electrónico.")

    official_student = find_student_by_code(student_code.strip())
    if not official_student:
        raise ValueError(
            f"La matrícula '{student_code.strip()}' no se encuentra en el catálogo oficial de estudiantes."
        )

    existing_student_user = find_user_by_student_db_id(official_student["id"])
    if existing_student_user:
        raise ValueError("Esta matrícula ya cuenta con un usuario registrado y activo.")

    password_hash = generate_password_hash(password)
    created_user = create_student_user(
        email=email.strip(),
        password_hash=password_hash,
        name=name.strip(),
        student_id=official_student["id"],
    )

    full_user = find_user_by_id(created_user["id"])
    return sanitize_user(full_user)


def _extract_bearer_token() -> str | None:
    auth_header = (request.headers.get("Authorization") or "").strip()
    if not auth_header:
        return None
    parts = auth_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return ""
    return parts[1].strip()


def is_request_using_bearer_auth() -> bool:
    return _extract_bearer_token() is not None


def get_current_user():
    bearer_token = _extract_bearer_token()
    if bearer_token is not None:
        if not bearer_token:
            return None
        return verify_mobile_access_token(bearer_token)

    user_id = session.get("user_id")
    if not user_id:
        return None
    user = find_user_by_id(user_id)
    if not user or not user.get("is_active"):
        return None
    return sanitize_user(user)


def logout_user(raw_refresh_token: str | None = None):
    if raw_refresh_token:
        try:
            revoke_mobile_refresh_token(raw_refresh_token)
        except Exception:
            pass
    session.clear()


def sanitize_user(user: dict):
    if not user:
        return None
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "studentId": user.get("student_id"),
        "studentCode": user.get("student_code"),
        "program": user.get("program"),
        "semester": user.get("semester"),
        "isActive": user.get("is_active"),
        "createdAt": user.get("created_at"),
    }


def _extract_origin_from_headers() -> str | None:
    origin = (request.headers.get("Origin") or "").strip()
    if origin and origin.lower() != "null":
        return origin.rstrip("/")

    referer = (request.headers.get("Referer") or "").strip()
    if referer:
        parsed = urlparse(referer)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
    return None


def validate_csrf_for_cookie_session():
    """
    Validates CSRF protection for mutating HTTP requests that rely on cookie-based sessions.
    1. Checks Origin / Referer against allowed origins and current host.
    2. Checks X-CSRF-Token / X-XSRF-TOKEN against session['csrf_token'] when present or enforced.
    Returns None if valid, or a (Response, status_code) tuple if rejected.
    """
    if request.method not in MUTATING_HTTP_METHODS:
        return None

    # Bearer-authenticated mobile requests do not use ambient cookies for authentication
    if is_request_using_bearer_auth():
        return None

    # Only applies when a cookie session is active
    if not session.get("user_id"):
        return None

    allowed_origins = set(get_cors_allowed_origins())
    host_origin = (request.host_url or "").strip().rstrip("/")
    if host_origin:
        allowed_origins.add(host_origin)

    request_origin = _extract_origin_from_headers()
    if request_origin:
        if request_origin not in allowed_origins:
            return (
                jsonify({"error": "Solicitud bloqueada por validación CSRF: origen no autorizado."}),
                403,
            )
    elif is_production_like():
        return (
            jsonify({"error": "Solicitud bloqueada por validación CSRF: falta cabecera Origin o Referer."}),
            403,
        )

    expected_csrf = session.get("csrf_token")
    provided_csrf = (
        request.headers.get("X-CSRF-Token")
        or request.headers.get("X-XSRF-TOKEN")
        or ""
    ).strip()

    enforce_csrf_token = (
        os.getenv("ENFORCE_CSRF_TOKEN", "true" if is_production_like() else "false")
        .strip()
        .lower()
        == "true"
    )

    if provided_csrf or enforce_csrf_token:
        if not expected_csrf or not provided_csrf or not secrets.compare_digest(provided_csrf, expected_csrf):
            return (
                jsonify({"error": "Token CSRF inválido o ausente."}),
                403,
            )

    return None


def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        csrf_error = validate_csrf_for_cookie_session()
        if csrf_error is not None:
            return csrf_error

        user = get_current_user()
        if not user:
            if is_request_using_bearer_auth() or is_strict_auth_enabled():
                return jsonify({"error": "No autorizado. Inicia sesión para continuar."}), 401
            return f(*args, **kwargs)
        return f(*args, **kwargs)

    return decorated_function


def require_role(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            csrf_error = validate_csrf_for_cookie_session()
            if csrf_error is not None:
                return csrf_error

            user = get_current_user()
            if not user:
                if is_request_using_bearer_auth() or is_strict_auth_enabled():
                    return jsonify({"error": "No autorizado. Inicia sesión para continuar."}), 401
                return f(*args, **kwargs)
            if user["role"] not in allowed_roles:
                return (
                    jsonify({
                        "error": "Acceso denegado. No tienes permisos para realizar esta acción."
                    }),
                    403,
                )
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def viewer_has_full_access():
    """
    True cuando quien consulta puede ver datos personales/históricos de citas
    (psicóloga). Un alumno autenticado nunca los ve. Sin sesión solo se permite
    mientras STRICT_AUTH esté desactivado en desarrollo local.
    """
    user = get_current_user()
    if user:
        return user["role"] == "psicologo"
    if is_request_using_bearer_auth():
        return False
    return not is_strict_auth_enabled()


PRIVATE_APPOINTMENT_FIELDS = (
    "studentName", "studentInitials", "studentAge", "studentSemester",
    "studentProgram", "consultationReason", "folio", "location", "modality",
    "cancellationReason", "cancellationObservation",
    "proposedDate", "proposedStartTime", "proposedEndTime", "rescheduleRequestedBy",
    "student_id", "student_name", "reason", "meeting_url", "location",
    "reschedule_reason", "cancellation_reason", "cancellation_observation",
    "proposed_date", "proposed_start_time", "proposed_end_time", "reschedule_requested_by",
    "cancelled_by", "user_id",
)


def redact_private_fields(items):
    """Elimina datos personales e históricos de una lista de dicts."""
    redacted = []
    for item in items:
        redacted.append({
            key: value
            for key, value in item.items()
            if key not in PRIVATE_APPOINTMENT_FIELDS
        })
    return redacted
