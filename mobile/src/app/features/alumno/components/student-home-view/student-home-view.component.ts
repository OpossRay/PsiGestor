import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  timeOutline,
  locationOutline,
  videocamOutline,
  businessOutline,
  personOutline,
  checkmarkCircle,
  alertCircleOutline,
  refreshOutline,
  chevronForwardOutline,
  chatboxEllipsesOutline,
  informationCircleOutline,
  documentTextOutline,
  clipboardOutline,
  arrowForwardOutline,
  swapHorizontalOutline,
  trashOutline,
  closeCircleOutline,
  warningOutline,
  helpCircleOutline,
} from 'ionicons/icons';
import { Appointment } from '../../../../core/models/availability.model';

export type StudentAppointmentsFilter =
  | 'all'
  | 'upcoming'
  | 'requests'
  | 'history'
  | 'cancelled';

@Component({
  selector: 'app-student-home-view',
  templateUrl: './student-home-view.component.html',
  styleUrls: ['./student-home-view.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner],
})
export class StudentHomeViewComponent {
  @Input() appointments: Appointment[] = [];
  @Input() studentName = 'Estudiante';
  @Input() studentEmail = '';
  @Input() specialistName = 'Lic. Mariana Rojas V.';
  @Input() specialistRole = 'Psicología Clínica';
  @Input() specialistCubicle = 'Cubículo 2B';
  @Input() isLoading = false;
  @Input() errorMessage: string | null = null;
  @Input() isFullHistory = false;
  @Input() pipgPending = false;
  @Input() pipgStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';

  @Output() bookAppointment = new EventEmitter<void>();
  @Output() retryLoad = new EventEmitter<void>();
  @Output() startPipg = new EventEmitter<void>();
  @Output() rescheduleAppointment = new EventEmitter<Appointment>();
  @Output() cancelAppointment = new EventEmitter<Appointment>();
  @Output() acceptReschedule = new EventEmitter<Appointment>();
  @Output() rejectReschedule = new EventEmitter<Appointment>();

  activeFilter: StudentAppointmentsFilter = 'all';

  constructor() {
    addIcons({
      calendarOutline,
      timeOutline,
      locationOutline,
      videocamOutline,
      businessOutline,
      personOutline,
      checkmarkCircle,
      alertCircleOutline,
      refreshOutline,
      chevronForwardOutline,
      chatboxEllipsesOutline,
      informationCircleOutline,
      documentTextOutline,
      clipboardOutline,
      arrowForwardOutline,
      swapHorizontalOutline,
      trashOutline,
      closeCircleOutline,
      warningOutline,
      helpCircleOutline,
    });
  }

  setFilter(filter: StudentAppointmentsFilter): void {
    this.activeFilter = filter;
  }

  get upcomingAppointments(): Appointment[] {
    return (this.appointments || [])
      .filter((apt) => this.isReserved(apt) && this.isUpcoming(apt))
      .sort((a, b) => this.compareAppointments(a, b));
  }

  get pendingRescheduleAppointments(): Appointment[] {
    return (this.appointments || [])
      .filter((apt) => this.isPendingReschedule(apt))
      .sort((a, b) => this.compareAppointments(a, b));
  }

  get historyAppointments(): Appointment[] {
    return (this.appointments || [])
      .filter((apt) => !this.isCancelled(apt) && !this.isPendingReschedule(apt) && this.isPast(apt))
      .sort((a, b) => this.compareAppointments(b, a));
  }

  get cancelledAppointments(): Appointment[] {
    return (this.appointments || [])
      .filter((apt) => this.isCancelled(apt))
      .sort((a, b) => this.compareAppointments(b, a));
  }

  get activeAppointments(): Appointment[] {
    const todayStr = this.getTodayIsoString();
    return (this.appointments || [])
      .filter((apt) => {
        const isNotCancelled = !this.isCancelled(apt);
        const isFutureOrToday = (apt.date || '') >= todayStr;
        return isNotCancelled && isFutureOrToday;
      })
      .sort((a, b) => this.compareAppointments(a, b));
  }

  get pastAppointments(): Appointment[] {
    const todayStr = this.getTodayIsoString();
    return (this.appointments || [])
      .filter((apt) => {
        const isCancelled = this.isCancelled(apt);
        const isPast = (apt.date || '') < todayStr;
        return isCancelled || isPast;
      })
      .sort((a, b) => this.compareAppointments(b, a));
  }

  get filteredAppointments(): Appointment[] {
    switch (this.activeFilter) {
      case 'upcoming':
        return this.upcomingAppointments;
      case 'requests':
        return this.pendingRescheduleAppointments;
      case 'history':
        return this.historyAppointments;
      case 'cancelled':
        return this.cancelledAppointments;
      default:
        return (this.appointments || []).slice().sort((a, b) => this.compareAppointments(b, a));
    }
  }

  private compareAppointments(a: Appointment, b: Appointment): number {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    return (a.start_time || '').localeCompare(b.start_time || '');
  }

  private getTodayIsoString(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  private getAppointmentTimestamp(date?: string, time?: string): number {
    if (!date || !time) return NaN;
    const cleanTime = time.trim().slice(0, 5);
    return new Date(`${date.substring(0, 10)}T${cleanTime}:00`).getTime();
  }

  isUpcoming(apt: Appointment): boolean {
    const start = this.getAppointmentTimestamp(apt.date, apt.start_time);
    return Number.isFinite(start) && start > Date.now();
  }

  isPast(apt: Appointment): boolean {
    const end = this.getAppointmentTimestamp(apt.date, apt.end_time || apt.start_time);
    return Number.isFinite(end) && end <= Date.now();
  }

  isReserved(apt: Appointment): boolean {
    const s = (apt.status || '').toLowerCase();
    return s === 'reserved' || s === 'reservado' || s === 'confirmada' || s === 'confirmado';
  }

  isPendingReschedule(apt: Appointment): boolean {
    const s = (apt.status || '').toLowerCase();
    return s === 'pending reschedule' || s === 'reprogramacion pendiente' || s === 'reprogramada';
  }

  isCancelled(apt: Appointment): boolean {
    const s = (apt.status || '').toLowerCase();
    return s === 'cancelled' || s === 'cancelado' || s === 'cancelada';
  }

  canCancelOrReschedule(apt: Appointment): boolean {
    return this.isReserved(apt) && this.isUpcoming(apt);
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (!year || !month || !day) return dateStr;
      const d = new Date(year, month - 1, day);
      const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return `${weekdays[d.getDay()]}, ${day} de ${months[d.getMonth()]} de ${year}`;
    } catch {
      return dateStr;
    }
  }

  formatTimeRange(startTime?: string | null, endTime?: string | null): string {
    if (!startTime || !endTime) return '';
    return `${this.formatTime12h(startTime)} – ${this.formatTime12h(endTime)}`;
  }

  formatTime12h(timeStr?: string | null): string {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? parts[1].padStart(2, '0') : '00';
    if (isNaN(h)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return `${h12}:${m} ${period}`;
  }

  getStatusBadge(status: string): { label: string; cssClass: string } {
    const s = (status || '').toLowerCase();
    if (s === 'reserved' || s === 'reservado' || s === 'confirmada' || s === 'confirmado') {
      return { label: 'Confirmada', cssClass: 'badge-confirmed' };
    }
    if (s === 'pending reschedule' || s === 'reprogramacion pendiente' || s === 'reprogramada') {
      return { label: 'Reprogramación pendiente', cssClass: 'badge-pending' };
    }
    if (s === 'cancelled' || s === 'cancelado' || s === 'cancelada') {
      return { label: 'Cancelada', cssClass: 'badge-cancelled' };
    }
    if (s === 'completed' || s === 'realizada' || s === 'completada') {
      return { label: 'Realizada', cssClass: 'badge-completed' };
    }
    return { label: status || 'Agendada', cssClass: 'badge-default' };
  }

  getModalityDisplay(modality?: string): { label: string; icon: string } {
    const m = (modality || '').toLowerCase();
    if (m === 'online' || m === 'en línea' || m === 'en linea') {
      return { label: 'En línea · Google Meet', icon: 'videocam-outline' };
    }
    return { label: 'Presencial · Cubículo 2B', icon: 'business-outline' };
  }

  onBookClick(): void {
    this.bookAppointment.emit();
  }

  onRetryClick(): void {
    this.retryLoad.emit();
  }

  onRescheduleClick(apt: Appointment): void {
    this.rescheduleAppointment.emit(apt);
  }

  onCancelClick(apt: Appointment): void {
    this.cancelAppointment.emit(apt);
  }

  onAcceptRescheduleClick(apt: Appointment): void {
    this.acceptReschedule.emit(apt);
  }

  onRejectRescheduleClick(apt: Appointment): void {
    this.rejectReschedule.emit(apt);
  }
}
