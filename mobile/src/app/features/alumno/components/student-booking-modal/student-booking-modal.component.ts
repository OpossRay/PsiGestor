import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonModal,
  IonContent,
  IonIcon,
  IonSpinner,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  calendarOutline,
  timeOutline,
  personOutline,
  businessOutline,
  videocamOutline,
  checkmarkCircle,
  alertCircleOutline
} from 'ionicons/icons';
import { Availability } from '../../../../core/models/availability.model';
import { CalendarService } from '../../../../core/services/calendar.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-student-booking-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonModal,
    IonContent,
    IonIcon,
    IonSpinner
  ],
  templateUrl: './student-booking-modal.component.html',
  styleUrls: ['./student-booking-modal.component.scss']
})
export class StudentBookingModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() slot: Availability | null = null;
  @Input() specialistName = 'Lic. Mariana Rojas V.';
  @Input() specialistRole = 'Psicología Clínica';
  @Input() specialistCubicle = 'Cubículo 2B';

  @Output() closeModal = new EventEmitter<void>();
  @Output() appointmentBooked = new EventEmitter<void>();

  private calendarService = inject(CalendarService);
  readonly authService = inject(AuthService);
  private toastCtrl = inject(ToastController);

  modality: 'Presencial' | 'En línea' = 'Presencial';
  location = 'Cubículo 2B - Departamento de Orientación y Psicología';
  reason = '';
  errorMessage = '';
  isSubmitting = false;

  constructor() {
    addIcons({
      closeOutline,
      calendarOutline,
      timeOutline,
      personOutline,
      businessOutline,
      videocamOutline,
      checkmarkCircle,
      alertCircleOutline
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.modality = 'Presencial';
    this.location = 'Cubículo 2B - Departamento de Orientación y Psicología';
    this.reason = '';
    this.errorMessage = '';
    this.isSubmitting = false;
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  get formattedDate(): string {
    if (!this.slot?.date) return '';
    try {
      const [year, month, day] = this.slot.date.split('-').map(Number);
      if (!year || !month || !day) return this.slot.date;
      const d = new Date(year, month - 1, day);
      const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return `${weekdays[d.getDay()]}, ${day} de ${months[d.getMonth()]}`;
    } catch {
      return this.slot.date;
    }
  }

  get formattedTimeRange(): string {
    if (!this.slot?.startTime || !this.slot?.endTime) return '';
    return `${this.formatTime12h(this.slot.startTime)} – ${this.formatTime12h(this.slot.endTime)}`;
  }

  formatTime12h(timeStr?: string): string {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ? mStr.padStart(2, '0') : '00';
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return `${h12}:${m} ${period}`;
  }

  setModality(mod: 'Presencial' | 'En línea'): void {
    this.modality = mod;
    if (mod === 'Presencial') {
      this.location = 'Cubículo 2B - Departamento de Orientación y Psicología';
    } else {
      this.location = 'Google Meet (el enlace se enviará a tu correo)';
    }
  }

  onClose(): void {
    if (this.isSubmitting) return;
    this.closeModal.emit();
  }

  confirmBooking(): void {
    this.errorMessage = '';
    const cleanReason = this.reason.trim();

    if (!cleanReason) {
      this.errorMessage = 'El motivo de la consulta es obligatorio para agendar tu cita.';
      return;
    }

    if (cleanReason.length < 5) {
      this.errorMessage = 'Por favor describe un motivo más detallado (mínimo 5 caracteres).';
      return;
    }

    if (!this.slot || !this.slot.date || !this.slot.startTime || !this.slot.endTime) {
      this.errorMessage = 'Los datos del horario seleccionado no son válidos.';
      return;
    }

    this.isSubmitting = true;

    const payload = {
      date: this.slot.date,
      start_time: this.slot.startTime,
      end_time: this.slot.endTime,
      duration: this.slot.duration || 45,
      modality: this.modality,
      location: this.modality === 'Presencial' ? this.location : undefined,
      meeting_url: this.modality === 'En línea' ? 'https://meet.google.com' : undefined,
      reason: cleanReason
    };

    this.calendarService.bookStudentAppointment(payload).subscribe({
      next: async () => {
        this.isSubmitting = false;
        this.appointmentBooked.emit();
        this.closeModal.emit();
        await this.showToast('¡Cita registrada y confirmada exitosamente!', 'success');
      },
      error: async (err) => {
        this.isSubmitting = false;
        const isPipgReq = err?.error?.code === 'PIPG_REQUIRED' || err?.status === 403;
        const msg = err.error?.error || 'Error al agendar la cita. Por favor intenta nuevamente.';
        this.errorMessage = msg;
        await this.showToast(msg, isPipgReq ? 'warning' : 'danger');
      }
    });
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
