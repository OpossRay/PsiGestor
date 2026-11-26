import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AppointmentMock {
  id: number;
  status: string; // 'Disponible' | 'Reservado' | 'Cancelado' | 'Inhabilitado' | 'Descanso habitual' | 'Reprogramación pendiente'
  studentName?: string;
  studentAge?: number;
  studentSemester?: string;
  studentProgram?: string;
  studentPhoto?: string;
  dateStr: string;
  sessionType?: string;
  duration?: number;
  modality?: string;
  location?: string;
  locationDetail?: string;
  reason?: string;
  derivedBy?: string;
  sessionCount?: string;
  disabledReason?: string;
  disabledObservation?: string;
  cancellationReason?: string | null;
  cancellationObservation?: string | null;
  // Rehabilitación de horarios cancelados
  rehabilitable?: boolean;
  endsAtMs?: number;
/* HU #53 — Asistencia y cierre de citas */
  appointmentId?: number;
  attendanceResult?: 'Attended' | 'NoShow' | null;
  closureNotes?: string | null;
  closedAt?: string | null;
}

@Component({
  selector: 'app-appointment-details',
  imports: [CommonModule],
  templateUrl: './appointment-details.html',
  styleUrl: './appointment-details.css',
})
export class AppointmentDetails {
  @Input() appointment: AppointmentMock | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() reschedule = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() rehabilitate = new EventEmitter<void>();
  @Output() disable = new EventEmitter<AppointmentMock>();
  @Output() enable = new EventEmitter<AppointmentMock>();
  @Output() manageSchedule = new EventEmitter<void>();
  @Output() closeAppointment = new EventEmitter<void>();


  // Use a default mock if none is provided, to match the design for now
  defaultMock: AppointmentMock = {
    id: 1,
    status: 'Reservado',
    studentName: 'Mateo Fernández Gómez',
    studentAge: 21,
    studentSemester: '7to Semestre',
    studentProgram: 'ISC',
    dateStr: 'Martes 22 de Oct., 10:00 - 10:45 AM',
    sessionType: 'Sesión individual',
    duration: 45,
    modality: 'Presencial',
    location: 'Cubículo 2B',
    locationDetail: 'ITESCAM • Edificio A',
    reason: '"Dificultades persistentes de concentración en evaluaciones bimestrales y manifestaciones de ansiedad pre-exámenes."',
    derivedBy: 'Coordinación Académica',
    sessionCount: '2da Sesión'
  };


/* HU #53 — Identificar citas cerradas */

get isClosed(): boolean {
  const appointment = this.appointment;

  if (!appointment) {
    return false;
  }

  return Boolean(
    appointment.closedAt ||
    appointment.status === 'Atendida' ||
    appointment.status === 'No asistio'
  );
}

/* HU #53 — Validar registro de asistencia */

get canCloseAppointment(): boolean {
  const appointment = this.appointment;

  if (!appointment || this.isClosed) {
    return false;
  }

  return (
    appointment.status === 'Reservado' &&
    typeof appointment.appointmentId === 'number' &&
    Number.isInteger(appointment.appointmentId) &&
    appointment.appointmentId > 0 &&
    typeof appointment.endsAtMs === 'number' &&
    Number.isFinite(appointment.endsAtMs) &&
    appointment.endsAtMs <= Date.now()
  );
}

/* HU #53 — Acciones permitidas antes de la sesión */

get canManageAppointment(): boolean {
  const appointment = this.appointment;

  if (!appointment || this.isClosed) {
    return false;
  }

  return (
    appointment.status === 'Reservado' &&
    typeof appointment.endsAtMs === 'number' &&
    Number.isFinite(appointment.endsAtMs) &&
    appointment.endsAtMs > Date.now()
  );
}

/* HU #53 — Resultado mostrado en el panel */

get closureResultLabel(): string {
  const appointment = this.displayAppointment;

  if (
    appointment.attendanceResult === 'Attended' ||
    appointment.status === 'Atendida'
  ) {
    return 'Atendida';
  }

  if (
    appointment.attendanceResult === 'NoShow' ||
    appointment.status === 'No asistio'
  ) {
    return 'No asistió';
  }

  return 'Cerrada';
}


  // El botón solo se ofrece para citas canceladas cuyo horario aún no ha pasado
  get canRehabilitate(): boolean {
    const appointment = this.displayAppointment;

    return (
      appointment.status === 'Cancelado' &&
      appointment.rehabilitable === true &&
      typeof appointment.endsAtMs === 'number' &&
      appointment.endsAtMs > Date.now()
    );
  }

  get isCancelledPast(): boolean {
    const appointment = this.displayAppointment;

    return (
      appointment.status === 'Cancelado' &&
      typeof appointment.endsAtMs === 'number' &&
      appointment.endsAtMs <= Date.now()
    );
  }

  get displayAppointment(): AppointmentMock {
    return this.appointment || this.defaultMock;
  }
}
