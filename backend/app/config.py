import os
from dotenv import load_dotenv

load_dotenv()

FORBIDDEN_SECRET_KEYS = frozenset({
    "",
    "psigestor_super_secret_session_key_2026",
    "changeme",
    "secret",
    "replace_with_secure_secret",
    "your_secret_key_here",
})

DEFAULT_DEV_ORIGINS = (
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "http://localhost:4000",
    "http://127.0.0.1:4000",
    "http://localhost:8100",
    "http://127.0.0.1:8100",
    "capacitor://localhost",
    "http://localhost",
    "https://localhost",
)

CAPACITOR_NATIVE_ORIGINS = (
    "capacitor://localhost",
    "http://localhost",
    "https://localhost",
)


def get_app_env() -> str:
    """
    Returns the canonical application environment: 'development', 'staging', or 'production'.
    If APP_ENV is missing or ambiguous while running on Render or with FLASK_ENV=production,
    defaults safely to 'production'.
    """
    raw_env = (os.getenv("APP_ENV") or "").strip().lower()
    if raw_env in ("production", "prod"):
        return "production"
    if raw_env in ("staging", "stage"):
        return "staging"
    if raw_env in ("development", "dev", "local", "testing", "test"):
        return "development"

    if os.getenv("RENDER", "").strip().lower() == "true":
        return "production"
    if (os.getenv("FLASK_ENV") or "").strip().lower() == "production":
        return "production"

    if raw_env:
        # Unknown non-empty value is treated as production-like for safety
        return "production"

    return "development"


def is_production() -> bool:
    return get_app_env() == "production"


def is_staging() -> bool:
    return get_app_env() == "staging"


def is_production_like() -> bool:
    return get_app_env() in ("staging", "production")


def get_secret_key() -> str:
    secret = (os.getenv("SECRET_KEY") or "").strip()
    if is_production_like():
        if secret in FORBIDDEN_SECRET_KEYS or len(secret) < 32:
            raise RuntimeError(
                "CRITICAL: SECRET_KEY must be set via environment variable, "
                "must not use default placeholder values, and must be at least 32 characters "
                f"in '{get_app_env()}' environment."
            )
        return secret

    if not secret or secret in FORBIDDEN_SECRET_KEYS:
        return "dev_only_psigestor_session_secret_key_local_2026_safe"
    return secret


def get_mobile_token_secret() -> str:
    session_secret = get_secret_key()
    mobile_secret = (os.getenv("MOBILE_TOKEN_SECRET") or "").strip()

    if is_production_like():
        if not mobile_secret or mobile_secret in FORBIDDEN_SECRET_KEYS or len(mobile_secret) < 32:
            raise RuntimeError(
                "CRITICAL: MOBILE_TOKEN_SECRET must be set via environment variable "
                "and be at least 32 characters in staging/production."
            )
        if mobile_secret == session_secret:
            raise RuntimeError(
                "CRITICAL: MOBILE_TOKEN_SECRET must be distinct from SECRET_KEY."
            )
        return mobile_secret

    if not mobile_secret:
        return "dev_only_psigestor_mobile_token_secret_key_2026_distinct"

    if mobile_secret == session_secret:
        raise RuntimeError(
            "CRITICAL: MOBILE_TOKEN_SECRET must be distinct from SECRET_KEY."
        )
    return mobile_secret


def is_strict_auth_enabled() -> bool:
    """
    In staging and production, strict authentication is always enabled unless
    explicitly overridden in an isolated development test context.
    In development, defaults to STRICT_AUTH env var (false if unset) to preserve local workflow.
    """
    if is_production():
        return True
    if is_staging():
        return os.getenv("STRICT_AUTH", "true").strip().lower() != "false"
    return os.getenv("STRICT_AUTH", "false").strip().lower() == "true"


def get_cors_allowed_origins() -> list[str]:
    raw = (os.getenv("CORS_ALLOWED_ORIGINS") or "").strip()
    if raw:
        origins = [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]
    elif is_production_like():
        origins = []
    else:
        origins = list(DEFAULT_DEV_ORIGINS)

    allow_capacitor = os.getenv("ALLOW_CAPACITOR_ORIGINS", "true").strip().lower() == "true"
    if allow_capacitor:
        for cap_origin in CAPACITOR_NATIVE_ORIGINS:
            if cap_origin not in origins:
                origins.append(cap_origin)

    return origins


def get_session_cookie_config() -> dict:
    secure_default = "true" if is_production_like() else "false"
    cookie_secure = os.getenv("SESSION_COOKIE_SECURE", secure_default).strip().lower() == "true"
    cookie_samesite = (os.getenv("SESSION_COOKIE_SAMESITE") or "Lax").strip()
    cookie_domain = (os.getenv("SESSION_COOKIE_DOMAIN") or "").strip() or None
    lifetime_seconds = int(os.getenv("SESSION_LIFETIME_SECONDS", "28800"))

    config = {
        "SESSION_COOKIE_HTTPONLY": True,
        "SESSION_COOKIE_SAMESITE": cookie_samesite,
        "SESSION_COOKIE_SECURE": cookie_secure,
        "PERMANENT_SESSION_LIFETIME": lifetime_seconds,
    }
    if cookie_domain:
        config["SESSION_COOKIE_DOMAIN"] = cookie_domain
    return config
