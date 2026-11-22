from flask import Blueprint, jsonify, request
from app.services.auth_service import require_role

from app.services.regular_schedule_service import (
    get_regular_schedule_config,
    save_regular_schedule_config
)


regular_schedule_bp = Blueprint(
    'regular_schedule',
    __name__
)


@regular_schedule_bp.route(
    '/regular-schedule',
    methods=['GET']
)
def get_regular_schedule_route():
    """
    Obtiene la configuración actual del horario habitual del psicólogo.
    ---
    tags:
      - Horario Habitual
    responses:
      200:
        description: Configuración del horario habitual o null si aún no existe
    """
    schedule = get_regular_schedule_config()

    if schedule is None:
        return jsonify(None), 200

    return jsonify(schedule), 200


@regular_schedule_bp.route(
    '/regular-schedule',
    methods=['PUT']
)
@require_role('psicologo')
def save_regular_schedule_route():
    """
    Guarda o actualiza la configuración del horario habitual y sincroniza disponibilidades.
    ---
    tags:
      - Horario Habitual
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            appointmentDuration:
              type: integer
              example: 60
            appointmentGapMinutes:
              type: integer
              example: 0
            availabilityRangeValue:
              type: integer
              example: 3
            availabilityRangeUnit:
              type: string
              enum: [days, weeks, months]
    responses:
      200:
        description: Horario habitual actualizado correctamente
      400:
        description: Datos de entrada inválidos
      401:
        description: No autenticado
      403:
        description: Acceso denegado (requiere rol psicologo)
    """
    data = request.get_json(
        silent=True
    )

    try:
        save_regular_schedule_config(
            data
        )

        schedule = get_regular_schedule_config()

        return jsonify(schedule), 200

    except ValueError as error:
        return jsonify({
            'error': str(error)
        }), 400