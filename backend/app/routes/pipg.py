
from flask import Blueprint, request, jsonify, current_app

from app.services.auth_service import get_current_user
from app.services.pipg_service import (
    get_or_start_assessment,
    save_progress,
    complete_assessment,
    get_completed_assessments,
)

pipg_bp = Blueprint("pipg_bp", __name__, url_prefix="/api/pipg")


def _check_session():
    if not get_current_user():
        return jsonify({
            "error": "No autorizado. Inicia sesión para continuar."
        }), 401

    return None


@pipg_bp.route("/assessment", methods=["GET"])
def get_assessment():
    auth_error = _check_session()
    if auth_error:
        return auth_error

    try:
        assessment = get_or_start_assessment()
        return jsonify({"assessment": assessment}), 200

    except PermissionError as error:
        return jsonify({"error": str(error)}), 403

    except Exception:
        current_app.logger.exception("Error al recuperar evaluación P-IPG")
        return jsonify({
            "error": "No fue posible recuperar la evaluación."
        }), 500


@pipg_bp.route("/assessment/answers", methods=["PUT"])
def save_answers():
    auth_error = _check_session()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    answers = data.get("answers")

    try:
        assessment = save_progress(answers)

        return jsonify({
            "message": "Respuestas guardadas correctamente.",
            "assessment": assessment,
        }), 200

    except (ValueError, TypeError) as error:
        return jsonify({"error": str(error)}), 400

    except PermissionError as error:
        return jsonify({"error": str(error)}), 403

    except Exception:
        current_app.logger.exception("Error al guardar respuestas P-IPG")
        return jsonify({
            "error": "No fue posible guardar las respuestas."
        }), 500


@pipg_bp.route("/assessment/complete", methods=["POST"])
def finish_assessment():
    auth_error = _check_session()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    answers = data.get("answers")

    try:
        assessment = complete_assessment(answers)

        return jsonify({
            "message": "Evaluación completada correctamente.",
            "assessment": assessment,
        }), 200

    except (ValueError, TypeError) as error:
        return jsonify({"error": str(error)}), 400

    except PermissionError as error:
        return jsonify({"error": str(error)}), 403

    except Exception:
        current_app.logger.exception("Error al completar evaluación P-IPG")
        return jsonify({
            "error": "No fue posible completar la evaluación."
        }), 500


@pipg_bp.route("/results", methods=["GET"])
def list_results():
    auth_error = _check_session()
    if auth_error:
        return auth_error

    try:
        assessments = get_completed_assessments()
        return jsonify({"assessments": assessments}), 200

    except PermissionError as error:
        return jsonify({"error": str(error)}), 403

    except Exception:
        current_app.logger.exception("Error al consultar resultados P-IPG")
        return jsonify({
            "error": "No fue posible consultar los resultados."
        }), 500
