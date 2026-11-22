from flask import Blueprint, request, jsonify
from app.repositories.pipg_repository import get_assessment_by_student

from app.services.auth_service import (
    authenticate_user,
    register_student,
    get_current_user,
    logout_user,
    require_auth,
)

auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}

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
        return jsonify({"error": f"Error interno al procesar el registro: {error}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")

    try:
        user = authenticate_user(email, password)
        return jsonify({"message": "Inicio de sesión exitoso.", "user": user}), 200
    except ValueError as error:
        return jsonify({"error": str(error)}), 401
    except PermissionError as error:
        return jsonify({"error": str(error)}), 403
    except Exception as error:
        return jsonify({"error": f"Error interno al iniciar sesión: {error}"}), 500


@auth_bp.route("/logout", methods=["POST"])
def logout():
    logout_user()
    return jsonify({"message": "Sesión cerrada correctamente."}), 200


@auth_bp.route("/me", methods=["GET"])
def me():
    user = get_current_user()

    if not user:
        return jsonify({
            "authenticated": False,
            "user": None,
            "pipg": None,
        }), 200

    pipg_status = None

    if user["role"] == "alumno" and user.get("studentId"):
        assessment = get_assessment_by_student(user["studentId"])

        pipg_status = {
            "status": assessment["status"] if assessment else "not_started",
            "completed": (
                assessment is not None
                and assessment["status"] == "completed"
            ),
        }

    return jsonify({
        "authenticated": True,
        "user": user,
        "pipg": pipg_status,
    }), 200