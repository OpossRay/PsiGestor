"""
Motor de puntuación del P-IPG (Gordon).

Fuente de las fórmulas: hoja "APLICACION Y CONTEO" del Excel proporcionado.
Se conservan las referencias repetidas y únicamente se corrige I136 -> I36
en la fórmula de la escala A, tal como se acordó.

Entrada:
    selected_cells: iterable de coordenadas Excel seleccionadas, por ejemplo
                    {"B7", "I8", "L10"}.
    Las coordenadas representan las celdas de selección (+/-), no los textos
    de los reactivos.

Este módulo calcula las puntuaciones directas. La validación de la distribución
de las 38 agrupaciones debe realizarse en la capa de validación de respuestas,
usando el mapa exacto de agrupaciones del instrumento.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from typing import Final


# Fórmulas copiadas de las celdas O11:W11 de "APLICACION Y CONTEO".
# Se mantienen las referencias duplicadas porque forman parte del Excel fuente.
FORMULAS: Final[dict[str, str]] = {
    "A": "H7+I8+I9+I10+K7+L8+K9+K10+I11+H12+I13+I14+L11+L12+L13+K14+I15+H16+H17+H18+L15+K16+L17+L18+I19+I20+I21+H22+K19+I20+I21+L21+K22+H23+I24+H25+H26+K23+L24+L25+L26+H27+I28+I29+I30+L27+L28+L29+K30+H31+H32+H33+I34+K31+K32+L33+K34+I35+I36+I37+H38+K35+L36+L37+L38+H39+H40+I41+H42+L39+K40+L41+L42",
    "R": "I7+I8+H9+I10+L7+L8+K9+L10+H11+H12+H13+I14+K11+K12+L13+K14+H15+I16+H17+H18+L15+L16+L17+K18+H19+I20+H21+H22+K19+L20+K21+K22+I23+I24+I25+H26+L23+L24+L25+K26+I27+I28+I29+H30+K27+L28+K29+K30+H31+I32+H33+H34+K31+L32+L33+L34+H35+I36+I37+I38+L35+K36+L37+L38+H39+I40+I41+I42+L39+L40+K41+L42",
    "E": "H7+I8+H9+H10+K7+K8+K9+L10+I11+H12+H13+H14+L11+K12+L13+L14+L15+K16+K17+K18+I15+I16+H17+I18+H19+I20+I21+I22+L19+L20+L21+K22+H23+H24+I25+H26+K23+K24+L25+K26+H28+H27+I29+H30+L27+L28+K29+L30+H31+I32+I33+I34+K31+L32+K33+K34+H35+H36+I37+H38+K35+K36+K37+L38+H39+I40+H41+H42+K39+K40+K41+L42",
    "S": "H7+H8+H9+I10+K7+L8+L9+L10+H11+H12+I13+H14+L11+K12+K14+K13+I15+I16+I17+H18+K15+K16+L17+K18+H19+H20+I21+H22+K19+L20+L21+L22+H23+I24+I25+I26+K23+L24+K25+K26+H27+I28+H29+H30+L27+K28+K29+K30+I31+I32+H33+I34+L31+L32+L33+K34+H35+I36+H37+H38+K35+K36+L37+K38+I39+I40+I41+H42+L39+K40+K41+K42",
    "C": "B7+C8+C9+C10+F7+F8+F9+E10+C11+C12+C13+B14+E11+E12+E13+F14+C15+B16+B17+B18+E15+E16+E17+F18+B19+B20+B21+C22+F19+F20+E21+F22+B23+B24+B25+C26+F23+F24+E25+F26+C27+B28+C29+C30+F27+E28+E29+E30+C31+B32+C33+C34+E31+F32+E33+E34+B35+C36+B37+B38+E35+F36+E37+E38+B39+B40+C41+B42+E39+F40+F41+F42+C43+B44+B45+B46+F43+F44+E45+F46",
    "O": "B7+B8+B9+C10+E7+F8+F9+F10+C11+C12+B13+C14+F11+F12+E13+F14+C15+C16+C17+B18+E15+E16+F17+E18+C19+C20+C21+B22+E19+F20+F21+F22+B23+B24+C25+B26+E23+F24+F25+F26+B27+B28+C29+B30+F27+F28+F29+E30+C31+B32+B33+B34+E31+E32+E33+F34+C35+C36+C37+B38+F35+F36+F37+E38+B39+C40+B41+B42+E39+E40+F41+E42+B43+B44+B45+C46+E43+E44+E45+F46",
    "P": "C7+C8+B9+C10+E7+E8+F9+E10+C11+B12+B13+B14+E11+F12+F13+F14+B15+B16+C16+C17+B18+F15+E16+F17+F18+C19+B20+C21+C22+E19+E20+E21+F22+C23+B24+C25+C26+E23+E24+E25+F26+B27+C28+C29+C30+E27+F28+E29+E30+B31+B32+B33+C34+E31+F32+F33+F34+B35+B36+C37+B38+F35+F36+E37+F38+B39+C40+C41+C42+E39+F40+E41+E42+C43+B44+C45+C46+F43+E44+E45+E46",
    "V": "B7+C8+B9+B10+E7+F8+E9+E10+B11+C12+B13+B14+E11+F12+E13+E14+C15+B16+C17+C18+E15+F16+F17+F18+C19+B20+B21+B22+E19+F20+E21+E22+B23+C24+C25+C26+E23+F24+E25+E26+B27+B28+B29+C30+F27+F28+E29+F30+C31+C32+B33+C34+F31+F32+E33+F34+B35+C36+C37+C38+F35+E36+E37+E38+C39+C40+C41+B42+F39+F40+F41+E42+C43+C44+B45+C46+F43+E44+F45+F46",
}

CELL_RE = re.compile(r"^[A-Z]{1,3}[1-9][0-9]*$")
REF_RE = re.compile(r"[A-Z]{1,3}[1-9][0-9]*")


class PIPGValidationError(ValueError):
    """Error de validación de respuestas o puntuación P-IPG."""


def normalize_selected_cells(selected_cells: Iterable[str]) -> set[str]:
    """Normaliza y valida coordenadas de celdas seleccionadas."""
    normalized: set[str] = set()
    for cell in selected_cells:
        if not isinstance(cell, str):
            raise PIPGValidationError("Cada celda seleccionada debe ser texto.")
        cell = cell.strip().upper()
        if not CELL_RE.fullmatch(cell):
            raise PIPGValidationError(f"Coordenada de celda inválida: {cell!r}.")
        normalized.add(cell)
    return normalized


def _score_formula(formula: str, selected: set[str]) -> int:
    # No convertir las referencias en set: las repeticiones del Excel cuentan.
    references = REF_RE.findall(formula)
    return sum(1 for reference in references if reference in selected)


def calculate_direct_scores(selected_cells: Iterable[str]) -> dict[str, int]:
    """
    Calcula las puntuaciones directas A, R, E, S, C, O, P y V.

    Una referencia repetida en una fórmula se cuenta repetidamente, igual que
    sucede al evaluar la fórmula original de Excel.
    """
    selected = normalize_selected_cells(selected_cells)
    scores = {
        scale: _score_formula(formula, selected)
        for scale, formula in FORMULAS.items()
    }

    # Autoestima: suma de las cuatro escalas indicadas en S11.
    scores["AE"] = scores["A"] + scores["R"] + scores["E"] + scores["S"]

    return scores



# Organización vertical de los 38 grupos:
# J7:J42 = grupos 1-9
# G7:G42 = grupos 10-18
# D7:D46 = grupos 19-28
# A7:A46 = grupos 29-38
#
# Cada grupo contiene cuatro descripciones consecutivas.
# Cada descripción tiene una celda positiva y otra negativa.

_GROUP_DEFINITIONS: Final = (
    ("J", "K", "L", 7, 42),
    ("G", "H", "I", 7, 42),
    ("D", "E", "F", 7, 46),
    ("A", "B", "C", 7, 46),
)


def validate_group_responses(selected_cells: Iterable[str]) -> None:
    """
    Valida los 38 grupos según la organización vertical del instrumento.
    Exige exactamente una respuesta positiva y una negativa por grupo.
    """
    selected = normalize_selected_cells(selected_cells)

    allowed = {
        f"{response_col}{row}"
        for _, plus_col, minus_col, start, end in _GROUP_DEFINITIONS
        for row in range(start, end + 1)
        for response_col in (plus_col, minus_col)
    }

    invalid = selected - allowed

    if invalid:
        raise PIPGValidationError(
            "Hay selecciones fuera de las celdas de respuesta del instrumento: "
            + ", ".join(sorted(invalid))
        )

    group_number = 0

    for _, plus_col, minus_col, start, end in _GROUP_DEFINITIONS:
        for first_row in range(start, end + 1, 4):
            group_number += 1
            rows = range(first_row, first_row + 4)

            plus_cells = {
                f"{plus_col}{row}"
                for row in rows
                if f"{plus_col}{row}" in selected
            }

            minus_cells = {
                f"{minus_col}{row}"
                for row in rows
                if f"{minus_col}{row}" in selected
            }

            if len(plus_cells) != 1 or len(minus_cells) != 1:
                raise PIPGValidationError(
                    f"Grupo {group_number}: se requiere exactamente "
                    f"una respuesta (+) y una (-); se encontraron "
                    f"{len(plus_cells)} (+) y {len(minus_cells)} (-)."
                )

            plus_row = int(next(iter(plus_cells))[len(plus_col):])
            minus_row = int(next(iter(minus_cells))[len(minus_col):])

            if plus_row == minus_row:
                raise PIPGValidationError(
                    f"Grupo {group_number}: no puedes seleccionar "
                    "la misma descripción como positiva y negativa."
                )


def calculate_validated_direct_scores(
    selected_cells: Iterable[str],
) -> dict[str, int]:
    """Valida los 38 grupos y después calcula las puntuaciones directas."""
    selected = normalize_selected_cells(selected_cells)
    validate_group_responses(selected)
    return calculate_direct_scores(selected)


# Transcripción confirmada del Cuadro C-14 disponible en el material revisado.
# None representa una celda en blanco del cuadro; no se interpola ni aproxima.
# La tabla debe completarse con la página/imagen íntegra antes de producción.
# Cuadro C-14: Normas percentiles para empleados diversos.
# Transcripción de la tabla proporcionada.
# None representa una celda vacía del cuadro original.
# No se realizan interpolaciones ni aproximaciones.

C14_PERCENTILES: Final[dict[int, dict[str, int | None]]] = {
    37: {"A": None, "R": None, "E": None, "S": None, "C": 99, "O": 99, "P": None, "V": None},
    36: {"A": None, "R": None, "E": None, "S": None, "C": 98, "O": 98, "P": None, "V": 99},
    35: {"A": None, "R": None, "E": 99, "S": None, "C": 96, "O": 97, "P": 99, "V": 98},
    34: {"A": None, "R": 99, "E": 98, "S": 99, "C": 94, "O": 95, "P": 98, "V": 96},
    33: {"A": 99, "R": 98, "E": 96, "S": 98, "C": 91, "O": 93, "P": 96, "V": 93},
    32: {"A": 98, "R": 96, "E": 94, "S": 97, "C": 88, "O": 90, "P": 93, "V": 90},
    31: {"A": 96, "R": 93, "E": 91, "S": 95, "C": 84, "O": 87, "P": 89, "V": 87},
    30: {"A": 94, "R": 89, "E": 87, "S": 92, "C": 79, "O": 83, "P": 84, "V": 83},
    29: {"A": 91, "R": 84, "E": 83, "S": 89, "C": 74, "O": 79, "P": 78, "V": 78},
    28: {"A": 88, "R": 78, "E": 78, "S": 85, "C": 69, "O": 74, "P": 72, "V": 72},
    27: {"A": 84, "R": 71, "E": 72, "S": 80, "C": 63, "O": 68, "P": 66, "V": 66},
    26: {"A": 79, "R": 63, "E": 66, "S": 74, "C": 57, "O": 62, "P": 60, "V": 59},
    25: {"A": 73, "R": 55, "E": 59, "S": 68, "C": 50, "O": 55, "P": 53, "V": 52},
    24: {"A": 66, "R": 48, "E": 52, "S": 61, "C": 43, "O": 48, "P": 46, "V": 45},
    23: {"A": 59, "R": 41, "E": 46, "S": 54, "C": 37, "O": 40, "P": 39, "V": 39},
    22: {"A": 51, "R": 35, "E": 40, "S": 47, "C": 31, "O": 33, "P": 33, "V": 33},
    21: {"A": 43, "R": 29, "E": 35, "S": 41, "C": 26, "O": 27, "P": 27, "V": 27},
    20: {"A": 36, "R": 24, "E": 30, "S": 36, "C": 22, "O": 21, "P": 22, "V": 22},
    19: {"A": 30, "R": 19, "E": 25, "S": 31, "C": 18, "O": 16, "P": 18, "V": 18},
    18: {"A": 25, "R": 15, "E": 21, "S": 26, "C": 14, "O": 12, "P": 14, "V": 14},
    17: {"A": 21, "R": 11, "E": 17, "S": 22, "C": 11, "O": 9, "P": 11, "V": 11},
    16: {"A": 17, "R": 8, "E": 14, "S": 18, "C": 8, "O": 6, "P": 8, "V": 8},
    15: {"A": 13, "R": 6, "E": 11, "S": 14, "C": 6, "O": 4, "P": 6, "V": 6},
    14: {"A": 10, "R": 4, "E": 8, "S": 11, "C": 4, "O": 3, "P": 4, "V": 4},
    13: {"A": 8, "R": 2, "E": 6, "S": 8, "C": 3, "O": 2, "P": 3, "V": 2},
    12: {"A": 6, "R": 1, "E": 4, "S": 6, "C": 2, "O": 1, "P": 2, "V": 1},
    11: {"A": 4, "R": None, "E": 3, "S": 4, "C": 1, "O": None, "P": 1, "V": None},
    10: {"A": 3, "R": None, "E": 2, "S": 2, "C": None, "O": None, "P": None, "V": None},
    9:  {"A": 2, "R": None, "E": 1, "S": 1, "C": None, "O": None, "P": None, "V": None},
    8:  {"A": 1, "R": None, "E": None, "S": None, "C": None, "O": None, "P": None, "V": None},
}


def lookup_percentiles(
    direct_scores: dict[str, int],
) -> dict[str, int | None]:
    """
    Busca percentiles exactos en el Cuadro C-14.

    No interpola valores entre renglones.
    Las celdas vacías del cuadro devuelven None.
    AE no tiene percentil propio en el Cuadro C-14.
    """
    result: dict[str, int | None] = {}

    for scale in ("A", "R", "E", "S", "C", "O", "P", "V"):
        pd = direct_scores.get(scale)
        row = C14_PERCENTILES.get(pd) if isinstance(pd, int) else None
        result[scale] = row.get(scale) if row is not None else None

    return result



def calculate_scores_with_percentiles(
    selected_cells: Iterable[str],
) -> dict[str, dict[str, int | None]]:
    """Valida respuestas y devuelve puntuaciones directas y PC consultados."""
    direct_scores = calculate_validated_direct_scores(selected_cells)
    return {
        "direct_scores": direct_scores,
        "percentile_scores": lookup_percentiles(direct_scores),
    }
