import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  alertCircleOutline,
  calendarOutline,
  timeOutline,
  trashOutline,
  warningOutline,
} from 'ionicons/icons';
import { CalendarService } from '../../../../core/services/calendar.service';
import { Appointment } from '../../../../core/models/availability.model';

@Component({
  selector: 'app-student-cancel-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonSpinner],
  templateUrl: './student-cancel-modal.component.html',
  styleUrls: ['./student-cancel-modal.component.scss'],
})
export class StudentCancelModalComponent {
  @Input() isOpen = false;
  @Input() appointment: Appointment | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() appointmentCancelled = new EventEmitter<void>();

  private calendarService = inject(CalendarService);

  reason = '';
  isConfirmed = false;
  isSubmitting = false;
  errorMessage = '';

  constructor() {
    addIcons({
      closeOutline,
      alertCircleOutline,
      calendarOutline,
      timeOutline,
      trashOutline,
      warningOutline,
    });
  }

  onClose(): void {
    if (this.isSubmitting) return;
    this.resetForm();
    this.closeModal.emit();
  }

  private resetForm(): void {
    this.reason = '';
    this.isConfirmed = false;
    this.isSubmitting = false;
    this.errorMessage = '';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  formatTime(timeStr?: string): string {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'p. m.' : 'a. m.';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  }

  submitCancellation(): void {
    if (this.isSubmitting || !this.appointment) return;
    this.errorMessage = '';

    const cleanReason = this.reason.trim();
    if (!cleanReason) {
      this.errorMessage = 'El motivo de cancelación es obligatorio.';
      return;
    }

    if (cleanReason.length < 5) {
      this.errorMessage = 'Por favor ingresa un motivo más descriptivo (mínimo 5 caracteres).';
      return;
    }

    if (!this.isConfirmed) {
      this.errorMessage = 'Debes marcar la casilla para confirmar definitivamente la cancelación.';
      return;
    }

    this.isSubmitting = true;
    this.calendarService.cancelStudentAppointment(this.appointment.id, cleanReason).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.resetForm();
        this.appointmentCancelled.emit();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.error ??
          err?.message ??
          'No fue posible cancelar la cita. Revisa tu conexión.';
      },
    });
  }
}
