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
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonBadge,
  IonIcon,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeCircleOutline, personOutline, alertCircleOutline } from 'ionicons/icons';
import { Availability } from '../../../../core/models/availability.model';
import { CalendarService } from '../../../../core/services/calendar.service';

@Component({
  selector: 'app-cancel-modal',
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
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonBadge,
    IonIcon
  ],
  templateUrl: './cancel-modal.component.html',
  styleUrls: ['./cancel-modal.component.scss']
})
export class CancelModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() mode: 'confirm' | 'view' = 'confirm';
  @Input() slot: Availability | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() appointmentCancelled = new EventEmitter<void>();

  private calendarService = inject(CalendarService);
  private toastController = inject(ToastController);

  reason = 'Fuerza mayor';
  observation = '';

  constructor() {
    addIcons({
      closeCircleOutline,
      personOutline,
      alertCircleOutline
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isOpen'] && this.isOpen) || changes['slot']) {
      this.reason = 'Fuerza mayor';
      this.observation = '';
    }
  }

  onClose(): void {
    this.closeModal.emit();
  }

  confirmCancel(): void {
    if (!this.slot) return;
    this.calendarService.cancelAppointment(
      this.slot.id,
      this.reason,
      this.observation
    ).subscribe({
      next: async () => {
        this.closeModal.emit();
        this.appointmentCancelled.emit();
        await this.showToast('Cita cancelada correctamente.', 'warning');
      },
      error: async (err) => {
        await this.showToast(err.error?.error || 'Error al cancelar la cita.', 'danger');
      }
    });
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'warning'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
