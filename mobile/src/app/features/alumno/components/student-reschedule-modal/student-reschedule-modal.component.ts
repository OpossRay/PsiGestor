import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  alertCircleOutline,
  calendarOutline,
  timeOutline,
  swapHorizontalOutline,
  checkmarkCircle,
  informationCircleOutline,
} from 'ionicons/icons';
import { CalendarService } from '../../../../core/services/calendar.service';
import { Appointment, Availability } from '../../../../core/models/availability.model';

@Component({
  selector: 'app-student-reschedule-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonSpinner],
  templateUrl: './student-reschedule-modal.component.html',
  styleUrls: ['./student-reschedule-modal.component.scss'],
})
export class StudentRescheduleModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() appointment: Appointment | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() rescheduleRequested = new EventEmitter<void>();

  private calendarService = inject(CalendarService);

  availableSlots: Availability[] = [];
  selectedSlotId: number | null = null;
  reason = '';
  isLoadingSlots = true;
  isSubmitting = false;
  errorMessage = '';

  constructor() {
    addIcons({
      closeOutline,
      alertCircleOutline,
      calendarOutline,
      timeOutline,
      swapHorizontalOutline,
      checkmarkCircle,
      informationCircleOutline,
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
      this.loadAvailableSlots();
    }
  }

  onClose(): void {
    if (this.isSubmitting) return;
    this.resetForm();
    this.closeModal.emit();
  }

  private resetForm(): void {
    this.selectedSlotId = null;
    this.reason = '';
    this.isSubmitting = false;
    this.errorMessage = '';
  }

  loadAvailableSlots(): void {
    this.isLoadingSlots = true;
    this.errorMessage = '';

    this.calendarService.getAvailabilities().subscribe({
      next: (availabilities) => {
        const todayStr = new Date().toISOString().split('T')[0];
        this.availableSlots = (availabilities || [])
          .filter((slot) => slot.status === 'Disponible' && (slot.date || '') >= todayStr)
          .sort((a, b) => {
            const dateComp = (a.date || '').localeCompare(b.date || '');
            if (dateComp !== 0) return dateComp;
            return (a.startTime || '').localeCompare(b.startTime || '');
          });
        this.isLoadingSlots = false;
      },
      error: () => {
        this.isLoadingSlots = false;
        this.errorMessage = 'No se pudo consultar la disponibilidad de la psicóloga.';
      },
    });
  }

  selectSlot(slotId: number): void {
    if (this.isSubmitting) return;
    this.selectedSlotId = slotId;
    this.errorMessage = '';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('es-MX', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
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

  submitReschedule(): void {
    if (this.isSubmitting || !this.appointment) return;
    this.errorMessage = '';

    if (!this.selectedSlotId) {
      this.errorMessage = 'Debes seleccionar un nuevo horario disponible de la lista.';
      return;
    }

    const cleanReason = this.reason.trim();
    if (!cleanReason) {
      this.errorMessage = 'El motivo de la reprogramación es obligatorio.';
      return;
    }

    if (cleanReason.length < 5) {
      this.errorMessage = 'Por favor ingresa un motivo más descriptivo (mínimo 5 caracteres).';
      return;
    }

    this.isSubmitting = true;
    this.calendarService
      .requestStudentReschedule(this.appointment.id, this.selectedSlotId, cleanReason)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.resetForm();
          this.rescheduleRequested.emit();
        },
        error: (err: any) => {
          this.isSubmitting = false;
          this.errorMessage =
            err?.error?.error ??
            err?.message ??
            'No fue posible enviar la solicitud de reprogramación.';
        },
      });
  }
}
