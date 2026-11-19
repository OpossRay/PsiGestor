
from flask import Blueprint, jsonify, request

from app.repositories.student_repository import search_students
from app.services.auth_service import require_role


students_bp = Blueprint("students", __name__)


@students_bp.route("/students", methods=["GET"])
@require_role("psicologo")
def list_students():
    """
    Busca alumnos en el catálogo oficial por nombre o matrícula (exclusivo psicólogo).
    ---
    tags:
      - Alumnos
    parameters:
      - name: search
        in: query
        type: string
        required: false
        description: Texto de búsqueda por nombre o matrícula
    responses:
      200:
        description: Lista de alumnos encontrados
      400:
        description: Texto de búsqueda inválido
      401:
        description: No autenticado
      403:
        description: Acceso denegado (requiere rol psicologo)
    """
    search_text = request.args.get("search", "").strip()

    if len(search_text) > 100:
        return jsonify({
            "error": "El texto de búsqueda es demasiado largo."
        }), 400

    try:
        students = search_students(search_text)
        return jsonify(students), 200
    except Exception:
        return jsonify({
            "error": "No fue posible consultar los alumnos."
        }), 500
