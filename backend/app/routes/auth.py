from flask import Blueprint, request, jsonify, make_response
from app.config import get_session_cookie_config, is_production_like
from app.repositories.refresh_token_repository import (
    ExpiredRefreshTokenError,
    InvalidRefreshTokenError,
    RefreshTokenError,
    RefreshTokenReuseDetectedError,
)
from app.services.auth_service import (
    authenticate_user,
    ensure_csrf_token,
    get_current_user,
    is_request_using_bearer_auth,
    issue_mobile_token_pair,
    logout_user,
    register_student,
    require_auth,
    revoke_all_user_sessions,
    rotate_mobile_tokens,
    validate_csrf_for_cookie_session,
)
from app.services.rate_limiter import (
    RateLimitExceededError,
    auth_rate_limiter,
    get_login_rate_limit,
    get_refresh_rate_limit,
)

auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/auth")


def _is_mobile_client_request(data: dict | None = None) -> bool:
    header_platform = (request.headers.get("X-Client-Platform") or "").strip().lower()
    if header_platform in ("mobile", "capacitor", "ionic", "android", "ios"):
        return True
    if isinstance(data, dict):
        body_platform = str(data.get("clientPlatform") or "").strip().lower()
        if body_platform in ("mobile", "capacitor", "ionic", "android", "ios"):
            return True
    return False


def _client_ip() -> str:
    forwarded = (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
    return forwarded or (request.remote_addr or "unknown")


def _attach_csrf_cookie(response, csrf_token: str):
    cookie_cfg = get_session_cookie_config()
    response.set_cookie(
        "XSRF-TOKEN",
        csrf_token,
        httponly=False,
        samesite=cookie_cfg.get("SESSION_COOKIE_SAMESITE", "Lax"),
        secure=cookie_cfg.get("SESSION_COOKIE_SECURE", False),
        domain=cookie_cfg.get("SESSION_COOKIE_DOMAIN"),
        path="/",
    )
    response.headers["X-CSRF-Token"] = csrf_token
    return response


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    student_code = data.get("studentCode") or data.get("matricula")
    program = data.get("program") or data.get("carrera")
    semester = data.get("semester") or data.get("semestre")

    try:
        user = register_student(
            name=name,
            email=email,
            password=password,
            student_code=student_code,
            program=program,
            semester=semester,
        )
        return (
            jsonify({
                "message": "Registro completado con éxito. Ahora puedes iniciar sesión.",
                "user": user,
            }),
            201,
        )
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        msg = (
            "Error interno al procesar el registro."
            if is_production_like()
            else f"Error interno al procesar el registro: {error}"
        )
        return jsonify({"error": msg}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip()
    password = data.get("password")
    is_mobile = _is_mobile_client_request(data)

    max_attempts, window_seconds = get_login_rate_limit()
    rate_key = f"login:{_client_ip()}:{email.lower()}"

    try:
        auth_rate_limiter.check_and_record(rate_key, max_attempts, window_seconds)
    except RateLimitExceededError as error:
        response = make_response(jsonify({"error": str(error)}), 429)
        response.headers["Retry-After"] = str(error.retry_after_seconds)
        return response

    try:
        user = authenticate_user(
            email=email,
            password=password,
            establish_cookie_session=not is_mobile,
        )
        auth_rate_limiter.reset(rate_key)

        payload = {
            "message": "Inicio de sesión exitoso.",
            "user": user,
        }

        if is_mobile:
            device_hint = (request.headers.get("User-Agent") or "")[:120] or None
            token_pair = issue_mobile_token_pair(user, device_hint=device_hint)
            payload.update(token_pair)
            return jsonify(payload), 200

        csrf_token = ensure_csrf_token()
        payload["csrfToken"] = csrf_token
        response = make_response(jsonify(payload), 200)
        return _attach_csrf_cookie(response, csrf_token)

    except ValueError as error:
        return jsonify({"error": str(error)}), 401
    except PermissionError as error:
        return jsonify({"error": str(error)}), 403
    except Exception as error:
        msg = (
            "Error interno al iniciar sesión."
            if is_production_like()
            else f"Error interno al iniciar sesión: {error}"
        )
        return jsonify({"error": msg}), 500


@auth_bp.route("/refresh", methods=["POST"])
def refresh_tokens():
    data = request.get_json(silent=True) or {}
    raw_refresh_token = data.get("refreshToken")

    max_attempts, window_seconds = get_refresh_rate_limit()
    rate_key = f"refresh:{_client_ip()}"

    try:
        auth_rate_limiter.check_and_record(rate_key, max_attempts, window_seconds)
    except RateLimitExceededError as error:
        response = make_response(jsonify({"error": str(error)}), 429)
        response.headers["Retry-After"] = str(error.retry_after_seconds)
        return response

    try:
        device_hint = (request.headers.get("User-Agent") or "")[:120] or None
        rotated = rotate_mobile_tokens(raw_refresh_token, device_hint=device_hint)
        return (
            jsonify({
                "message": "Sesión renovada correctamente.",
                **rotated,
            }),
            200,
        )
    except RefreshTokenReuseDetectedError as error:
        return jsonify({"error": str(error), "code": "TOKEN_REUSE_DETECTED"}), 401
    except (InvalidRefreshTokenError, ExpiredRefreshTokenError, RefreshTokenError) as error:
        return jsonify({"error": str(error)}), 401
    except PermissionError as error:
        return jsonify({"error": str(error)}), 403
    except Exception as error:
        msg = (
            "Error interno al renovar la sesión."
            if is_production_like()
            else f"Error interno al renovar la sesión: {error}"
        )
        return jsonify({"error": msg}), 500


@auth_bp.route("/logout", methods=["POST"])
def logout():
    csrf_error = validate_csrf_for_cookie_session()
    if csrf_error is not None:
        return csrf_error

    data = request.get_json(silent=True) or {}
    raw_refresh_token = data.get("refreshToken")

    logout_user(raw_refresh_token=raw_refresh_token)
    response = make_response(jsonify({"message": "Sesión cerrada correctamente."}), 200)
    response.delete_cookie("XSRF-TOKEN", path="/")
    return response


@auth_bp.route("/revoke-all", methods=["POST"])
@require_auth
def revoke_all():
    user = get_current_user()
    if not user:
        return jsonify({"error": "No autenticado."}), 401

    revoked_count = revoke_all_user_sessions(int(user["id"]))
    return (
        jsonify({
            "message": "Todas las sesiones móviles activas han sido revocadas.",
            "revokedCount": revoked_count,
        }),
        200,
    )


@auth_bp.route("/me", methods=["GET"])
def me():
    user = get_current_user()
    if not user:
        return jsonify({"authenticated": False, "user": None}), 200

    payload = {"authenticated": True, "user": user}
    if not is_request_using_bearer_auth():
        csrf_token = ensure_csrf_token()
        payload["csrfToken"] = csrf_token
        response = make_response(jsonify(payload), 200)
        return _attach_csrf_cookie(response, csrf_token)

    return jsonify(payload), 200
