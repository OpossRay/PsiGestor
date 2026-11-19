import os
import psycopg
from dotenv import load_dotenv
from app.config import is_production_like, get_app_env

load_dotenv()

FORBIDDEN_PROD_PASSWORDS = frozenset({
    "psigestor_password",
    "password",
    "postgres",
    "123456",
})


def normalize_database_url(raw_url: str) -> str:
    url = raw_url.strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


def get_db_connection_params() -> dict:
    """
    Resolves PostgreSQL connection parameters from DATABASE_URL (Render standard)
    or individual DB_* environment variables (local Docker/development).
    """
    database_url = (os.getenv("DATABASE_URL") or "").strip()
    if database_url:
        normalized_url = normalize_database_url(database_url)
        if is_production_like():
            for forbidden in FORBIDDEN_PROD_PASSWORDS:
                if f":{forbidden}@" in normalized_url:
                    raise RuntimeError(
                        f"CRITICAL: Forbidden demonstration database password detected in DATABASE_URL for '{get_app_env()}'."
                    )
        return {"conninfo": normalized_url}

    host = (os.getenv("DB_HOST") or "").strip()
    port = (os.getenv("DB_PORT") or "5432").strip()
    dbname = (os.getenv("DB_NAME") or "").strip()
    user = (os.getenv("DB_USER") or "").strip()
    password = os.getenv("DB_PASSWORD") or ""

    if is_production_like():
        if not host or not dbname or not user or not password:
            raise RuntimeError(
                f"CRITICAL: DATABASE_URL or full DB_HOST/DB_NAME/DB_USER/DB_PASSWORD must be configured in '{get_app_env()}'."
            )
        if password in FORBIDDEN_PROD_PASSWORDS:
            raise RuntimeError(
                f"CRITICAL: Demonstration database password is not permitted in '{get_app_env()}'."
            )
    else:
        host = host or "localhost"
        dbname = dbname or "psigestor_db"
        user = user or "psigestor_user"
        password = password or "psigestor_password"

    return {
        "host": host,
        "port": port,
        "dbname": dbname,
        "user": user,
        "password": password,
    }


def get_db_connection():
    params = get_db_connection_params()
    if "conninfo" in params:
        return psycopg.connect(params["conninfo"])
    return psycopg.connect(
        host=params["host"],
        port=params["port"],
        dbname=params["dbname"],
        user=params["user"],
        password=params["password"],
    )
