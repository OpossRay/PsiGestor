export type InvalidationReason =
  | 'Reunión'
  | 'Comida'
  | 'Actividad personal'
  | 'Evento académico'
  | 'Emergencia'
  | 'Otro motivo';

export interface DisabledSchedule {
  id?: number;
  type: 'Puntual' | 'Rango de fechas';
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  reason: InvalidationReason;
  observation?: string;
  hasConflict?: boolean;
}

export interface Availability {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  breakTime: number;
  status:
    | 'Disponible'
    | 'Reservado'
    | 'Reprogramacion pendiente'
    | 'Inhabilitado'
    | 'Cancelado';
  createdAt?: string;
  studentName?: string;
  studentInitials?: string;
  studentAge?: number;
  studentSemester?: string;
  studentProgram?: string;
  consultationReason?: string;
  modality?: string;
  location?: string;
  folio?: string;
  proposedDate?: string;
  proposedStartTime?: string;
  proposedEndTime?: string;
  cancellationReason?: string;
  cancellationObservation?: string;
  rescheduleRequestedBy?: 'psicologo' | 'alumno';
}

export interface Student {
  id: number;
  studentId: string;
  name: string;
  program: string;
  semester: number;
}

export interface Appointment {
  id: number;
  student_id: number;
  student_name: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  modality: 'In person' | 'Online' | 'Presencial' | 'En línea' | string;
  location: string | null;
  meeting_url: string | null;
  reason: string;
  status: string;
  created_at: string;
  reschedule_requested_by?: 'psicologo' | 'alumno' | null;
  proposed_date?: string | null;
  proposed_start_time?: string | null;
  proposed_end_time?: string | null;
  proposed_availability_id?: number | null;
  reschedule_reason?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  rescheduled_at?: string | null;
}
