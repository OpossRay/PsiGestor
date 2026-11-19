from flask import Flask, jsonify
import os
from dotenv import load_dotenv
from flask_cors import CORS
from flasgger import Swagger
from werkzeug.exceptions import HTTPException

from app.config import (
    get_app_env,
    get_cors_allowed_origins,
    get_mobile_token_secret,
    get_secret_key,
    get_session_cookie_config,
    is_production_like,
)
from app.database import get_db_connection
from app.routes.availability import availability_bp
from app.routes.regular_schedule import regular_schedule_bp
from app.routes.appointments import appointments_bp
from app.routes.students import students_bp
from app.routes.auth import auth_bp
from app.services.auth_service import get_current_user
from app.init_db import init_database


load_dotenv()

if (
    os.environ.get("WERKZEUG_RUN_MAIN") != "true"
    and os.environ.get("SKIP_DB_INIT_ON_IMPORT", "false").strip().lower() != "true"
):
    try:
        init_database(reset=False)
    except Exception as init_error:
        if is_production_like():
            raise
        print(f"[app] Advertencia al inicializar BD: {init_error}")


def create_app() -> Flask:
    flask_app = Flask(__name__)

    # Fail-fast validation of both session and mobile token secrets
    flask_app.secret_key = get_secret_key()
    get_mobile_token_secret()

    flask_app.config.update(get_session_cookie_config())

    CORS(
        flask_app,
        supports_credentials=True,
        origins=get_cors_allowed_origins(),
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-CSRF-Token",
            "X-XSRF-TOKEN",
            "X-Client-Platform",
        ],
        expose_headers=["X-CSRF-Token"],
    )

    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "PsiGestor API",
            "description": (
                "API REST oficial de PsiGestor para Web (Angular SSR con cookies HttpOnly + CSRF) "
                "y Aplicación Móvil (Ionic/Capacitor con Access Tokens de corta duración y Refresh Tokens rotativos)."
            ),
            "version": "2.0.0",
        },
        "securityDefinitions": {
            "BearerAuth": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "Token de acceso móvil en formato: Bearer <accessToken>",
            },
            "CsrfToken": {
                "type": "apiKey",
                "name": "X-CSRF-Token",
                "in": "header",
                "description": "Token CSRF requerido en operaciones mutantes autenticadas por cookie.",
            },
        },
    }
    Swagger(flask_app, template=swagger_template)

    flask_app.register_blueprint(auth_bp)
    flask_app.register_blueprint(availability_bp)
    flask_app.register_blueprint(regular_schedule_bp)
    flask_app.register_blueprint(appointments_bp)
    flask_app.register_blueprint(students_bp)

    @flask_app.route("/")
    def inicio():
        """
        Verifica disponibilidad básica del servicio raíz.
        ---
        tags:
          - Sistema
        responses:
          200:
            description: Servicio activo
        """
        return "Pfunciona"

    @flask_app.route("/health", methods=["GET"])
    def health_check():
        """
        Verifica el estado de salud del backend y la conectividad con PostgreSQL sin exponer secretos.
        ---
        tags:
          - Sistema
        responses:
          200:
            description: Servicio y base de datos operativos
          503:
            description: Servicio degradado o sin conexión a base de datos
        """
        connection = None
        try:
            connection = get_db_connection()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
            return (
                jsonify({
                    "status": "ok",
                    "service": "psigestor-backend",
                    "environment": get_app_env(),
                }),
                200,
            )
        except Exception:
            return (
                jsonify({
                    "status": "degraded",
                    "service": "psigestor-backend",
                    "environment": get_app_env(),
                }),
                503,
            )
        finally:
            if connection is not None:
                connection.close()

    @flask_app.route("/db", methods=["GET"])
    def probar_db():
        """
        Ruta de diagnóstico de base de datos (restringida en staging y producción).
        ---
        tags:
          - Sistema
        responses:
          200:
            description: Conexión verificada
          403:
            description: No autorizado en entornos productivos
          500:
            description: Error de conexión a base de datos
        """
        if is_production_like():
            user = get_current_user()
            if not user or user.get("role") != "psicologo":
                return jsonify({"error": "No autorizado."}), 403

        connection = None
        try:
            connection = get_db_connection()
            with connection.cursor() as cursor:
                if is_production_like():
                    cursor.execute("SELECT 1;")
                    cursor.fetchone()
                    return jsonify({"status": "ok"}), 200

                cursor.execute("SELECT current_user, current_database();")
                resultado = cursor.fetchone()
                return f"Usuario: {resultado[0]} | Base de datos: {resultado[1]}"
        except Exception as error:
            if is_production_like():
                return jsonify({"status": "error", "error": "Error de conexión a base de datos."}), 500
            return f"Error de conexión: {error}", 500
        finally:
            if connection is not None:
                connection.close()

    @flask_app.errorhandler(Exception)
    def handle_unexpected_exception(error: Exception):
        if isinstance(error, HTTPException):
            return error
        if is_production_like():
            return jsonify({"error": "Error interno del servidor."}), 500
        return jsonify({"error": f"Error interno del servidor: {error}"}), 500

    return flask_app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug_enabled = (
        get_app_env() == "development"
        and os.getenv("FLASK_DEBUG", "false").strip().lower() == "true"
    )
    app.run(host="0.0.0.0", port=port, debug=debug_enabled)
