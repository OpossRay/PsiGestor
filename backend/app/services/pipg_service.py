
from app.repositories import pipg_repository
from app.services.auth_service import get_current_user
from app.services.pipg_scoring_service import (
    PIPGValidationError,
    calculate_scores_with_percentiles,
    normalize_selected_cells,
)


VALID_COLUMNS = {
    7: ("B", "C", "E", "F", "H", "I", "K", "L"),
    8: ("B", "C", "E", "F", "H", "I", "K", "L"),
    9: ("B", "C", "E", "F", "H", "I", "K", "L"),
    10: ("B", "C", "E", "F", "H", "I", "K", "L"),
    # Las filas 7 a 42 tienen cuatro opciones.
}

for row in range(11, 43):
    VALID_COLUMNS[row] = ("B", "C", "E", "F", "H", "I", "K", "L")

# Las filas 43 a 46 solo tienen dos opciones.
for row in range(43, 47):
    VALID_COLUMNS[row] = ("B", "C", "E", "F")


def _require_authenticated_user():
    """Obtiene al usuario real de la sesión."""
    user = get_current_user()

    if not user:
        raise PermissionError("Debes iniciar sesión para continuar.")

    return user


def _require_student(user):
    """Comprueba que el usuario sea alumno y tenga estudiante asociado."""
    if user.get("role") != "alumno":
        raise PermissionError("Esta operación es exclusiva para alumnos.")

    student_id = user.get("studentId")

    if not student_id:
        raise PermissionError(
            "La cuenta no tiene un estudiante asociado."
        )

    return student_id


def _require_psychologist(user):
    """Comprueba que el usuario sea psicóloga."""
    if user.get("role") != "psicologo":
        raise PermissionError(
            "No tienes permisos para consultar los resultados."
        )


def _normalize_answers(answers):
    """Valida y normaliza el formato de las respuestas."""
    if not isinstance(answers, dict):
        raise PIPGValidationError(
            "Las respuestas deben enviarse como un objeto."
        )

    selected_cells = answers.get("selectedCells")

    if not isinstance(selected_cells, list):
        raise PIPGValidationError(
            "Debes enviar selectedCells como una lista."
        )

    normalized = normalize_selected_cells(selected_cells)

    invalid_cells = []

    for cell in normalized:
        column = "".join(character for character in cell if character.isalpha())
        row_text = "".join(character for character in cell if character.isdigit())

        row = int(row_text)

        if row not in VALID_COLUMNS or column not in VALID_COLUMNS[row]:
            invalid_cells.append(cell)

    if invalid_cells:
        raise PIPGValidationError(
            "Hay celdas que no pertenecen al instrumento: "
            + ", ".join(sorted(invalid_cells))
        )

    return {"selectedCells": sorted(normalized)}


def get_or_start_assessment():
    """
    Recupera la evaluación del alumno o crea una nueva.
    Una evaluación completada nunca se reinicia.
    """
    user = _require_authenticated_user()
    student_id = _require_student(user)

    assessment = pipg_repository.get_assessment_by_student(student_id)

    if assessment:
        return assessment

    return pipg_repository.create_assessment(student_id)


def save_progress(answers):
    """Guarda respuestas parciales sin permitir modificar una evaluación finalizada."""
    user = _require_authenticated_user()
    student_id = _require_student(user)

    normalized_answers = _normalize_answers(answers)

    assessment = pipg_repository.get_assessment_by_student(student_id)

    if not assessment:
        pipg_repository.create_assessment(student_id)

    return pipg_repository.save_assessment_answers(
        student_id,
        normalized_answers,
    )


def complete_assessment(answers):
    """
    Valida los 38 grupos, calcula las puntuaciones en el backend
    y finaliza la evaluación.
    """
    user = _require_authenticated_user()
    student_id = _require_student(user)

    normalized_answers = _normalize_answers(answers)

    assessment = pipg_repository.get_assessment_by_student(student_id)

    if not assessment:
        raise ValueError(
            "No existe una evaluación iniciada. Inicia la evaluación primero."
        )

    if assessment["status"] == "completed":
        raise ValueError(
            "Esta evaluación ya fue completada y no puede repetirse."
        )

    scores = calculate_scores_with_percentiles(
        normalized_answers["selectedCells"]
    )

    return pipg_repository.complete_assessment(
        student_id=student_id,
        answers=normalized_answers,
        direct_scores=scores["direct_scores"],
        percentile_scores=scores["percentile_scores"],
    )


def get_completed_assessments():
    """Permite a la psicóloga consultar las evaluaciones completadas."""
    user = _require_authenticated_user()
    _require_psychologist(user)

    return pipg_repository.get_all_completed_assessments()
