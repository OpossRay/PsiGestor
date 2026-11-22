import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonInput,
  IonTextarea,
  IonBadge,
  IonIcon,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { timeOutline, syncOutline, calendarOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { Availability } from '../../../../core/models/availability.model';
import { CalendarService } from '../../../../core/services/calendar.service';

@Component({
  selector: 'app-reschedule-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonItem,
    IonInput,
    IonTextarea,
    IonBadge,
    IonIcon
  ],
  templateUrl: './reschedule-modal.component.html',
  styleUrls: ['./reschedule-modal.component.scss']
})
export class RescheduleModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() mode: 'propose' | 'review' = 'propose';
  @Input() slot: Availability | null = null;
  @Input() allAvailabilities: Availability[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() rescheduleProposed = new EventEmitter<void>();
  @Output() rescheduleApproved = new EventEmitter<void>();
  @Output() rescheduleRejected = new EventEmitter<void>();
  @Output() modifyProposal = new EventEmitter<Availability>();

  private calendarService = inject(CalendarService);
  private toastController = inject(ToastController);

  newDate = '';
  selectedNewSlot: Availability | null = null;
  reason = 'Ajuste de agenda psicopedagógica';

  constructor() {
    addIcons({
      timeOutline,
      syncOutline,
      calendarOutline,
      checkmarkCircleOutline,
      closeCircleOutline
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isOpen'] && this.isOpen) || (changes['slot'] && this.slot)) {
      if (this.slot) {
        this.newDate = this.slot.date;
      }
      this.selectedNewSlot = null;
      this.reason = 'Ajuste de agenda psicopedagógica';
    }
  }

  get availableSlotsForReschedule(): Availability[] {
    if (!this.newDate) return [];
    return this.allAvailabilities.filter(item =>
      item.date === this.newDate &&
      item.status === 'Disponible' &&
      item.id !== this.slot?.id
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  onClose(): void {
    this.closeModal.emit();
  }

  selectRescheduleSlot(slot: Availability): void {
    this.selectedNewSlot = slot;
  }

  saveReschedule(): void {
    if (!this.slot || !this.selectedNewSlot) {
      this.showToast('Por favor selecciona el nuevo horario propuesto.', 'warning');
      return;
    }

    this.calendarService.rescheduleAppointment(
      this.slot.id,
      this.newDate,
      this.selectedNewSlot.startTime,
      this.selectedNewSlot.endTime,
      this.reason
    ).subscribe({
      next: async () => {
        this.closeModal.emit();
        this.rescheduleProposed.emit();
        await this.showToast('Propuesta de reprogramación enviada correctamente.', 'warning');
      },
      error: async (err) => {
        await this.showToast(err.error?.error || 'Error al proponer la reprogramación.', 'danger');
      }
    });
  }

  onApprove(): void {
    if (!this.slot) return;
    this.calendarService.approveReschedule(this.slot.id).subscribe({
      next: async () => {
        this.closeModal.emit();
        this.rescheduleApproved.emit();
        await this.showToast('Reprogramación aprobada correctamente. La cita ha sido confirmada en el nuevo horario.', 'success');
      },
      error: async (err) => {
        await this.showToast(err.error?.error || 'Error al aprobar la reprogramación.', 'danger');
      }
    });
  }

  onReject(): void {
    if (!this.slot) return;
    const isAlumno = this.slot.rescheduleRequestedBy === 'alumno';
    const confirmMsg = isAlumno
      ? '¿Rechazar la solicitud de cambio del alumno? La cita se mantendrá en su horario original.'
      : '¿Deseas cancelar la propuesta de reprogramación?';

    if (!confirm(confirmMsg)) return;

    this.calendarService.rejectReschedule(this.slot.id).subscribe({
      next: async (res) => {
        this.closeModal.emit();
        this.rescheduleRejected.emit();
        if (res.action === 'cancelled') {
          await this.showToast('Propuesta cancelada. La cita ha sido cancelada.', 'warning');
        } else {
          await this.showToast('Solicitud rechazada. La cita se mantiene en su horario original.', 'success');
        }
      },
      error: async (err) => {
        await this.showToast(err.error?.error || 'Error al rechazar la reprogramación.', 'danger');
      }
    });
  }

  onModifyProposal(): void {
    if (this.slot) {
      this.modifyProposal.emit(this.slot);
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
