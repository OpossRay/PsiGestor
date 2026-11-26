/** HU #53: resultado de asistencia y cierre definitivo. */
export type AttendanceResult = 'Attended' | 'NoShow';

export interface ClosureAppointmentSummary {
  /** ID real de appointments.id (NO el ID de availabilities). */
  id: number;
  studentName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  modality?: string;
  location?: string;
}

export interface CloseAppointmentPayload {
  attendance_result: AttendanceResult;
  closure_notes: string;
}

export interface ClosedAppointment {
  id: number;
  status: 'Closed';
  attendance_result: AttendanceResult;
  closure_notes: string;
  closed_at: string;
  closed_by: number;
}

export interface CloseAppointmentResponse {
  message: string;
  appointment: ClosedAppointment;
}

export function attendanceLabel(result: AttendanceResult | null | undefined): string {
  if (result === 'Attended') return 'Atendida';
  if (result === 'NoShow') return 'No asistió';
  return 'Sin registrar';
}
