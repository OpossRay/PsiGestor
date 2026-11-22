import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  calendarOutline,
  checkmarkCircleOutline,
  searchOutline,
  addOutline,
  closeCircleOutline,
  arrowBackOutline,
  optionsOutline
} from 'ionicons/icons';
import { Availability } from '../../../../core/models/availability.model';
import { AppointmentCardComponent } from '../appointment-card/appointment-card.component';
import { RescheduleRequestCardComponent } from '../reschedule-request-card/reschedule-request-card.component';

export type P09SubTab = 'programadas' | 'reprogramaciones';

@Component({
  selector: 'app-gestion-citas-view',
  templateUrl: './gestion-citas-view.component.html',
  styleUrls: ['./gestion-citas-view.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    AppointmentCardComponent,
    RescheduleRequestCardComponent
  ]
})
export class GestionCitasViewComponent implements OnInit {
  @Input() psychologistDisplayName = 'Lic. Mariana Rojas V.';
  @Input() availabilities: Availability[] = [];
  @Input() inProgressSlotKeys: Set<string> = new Set();
  @Input() completedSlotKeys: Set<string> = new Set();
  @Input() isLoading = false;
  @Input() statusFilter = 'todos';

  @Output() backClick = new EventEmitter<void>();
  @Output() menuClick = new EventEmitter<void>();
  @Output() newAppointment = new EventEmitter<void>();
  @Output() slotClick = new EventEmitter<Availability>();
  @Output() startSession = new EventEmitter<Availability>();
  @Output() completeSession = new EventEmitter<Availability>();
  @Output() approveReschedule = new EventEmitter<Availability>();
  @Output() rejectReschedule = new EventEmitter<Availability>();
  @Output() changeReschedule = new EventEmitter<Availability>();

  activeSubTab: P09SubTab = 'reprogramaciones';
  searchQuery = '';
  modalityFilter: 'all' | 'Presencial' | 'En línea' = 'all';

  constructor() {
    addIcons({
      timeOutline,
      calendarOutline,
      checkmarkCircleOutline,
      searchOutline,
      addOutline,
      closeCircleOutline,
      arrowBackOutline,
      optionsOutline
    });
  }

  ngOnInit(): void {
    // Si no hay solicitudes pendientes de reprogramación, abrir en programadas
    if (this.pendingReschedules.length === 0 && this.scheduledAppointments.length > 0) {
      this.activeSubTab = 'programadas';
    }
  }

  get pendingReschedules(): Availability[] {
    return (this.availabilities || [])
      .filter(s => s.status === 'Reprogramacion pendiente')
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }

  get scheduledAppointments(): Availability[] {
    return (this.availabilities || [])
      .filter(s => s.status === 'Reservado')
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }

  get filteredScheduledAppointments(): Availability[] {
    return this.scheduledAppointments.filter(s => {
      if (this.modalityFilter !== 'all') {
        const itemModality = (s.modality === 'Online' || s.modality === 'En línea') ? 'En línea' : 'Presencial';
        if (itemModality !== this.modalityFilter) return false;
      }

      if (this.searchQuery.trim().length > 0) {
        const q = this.searchQuery.trim().toLowerCase();
        const studentMatch = (s.studentName || '').toLowerCase().includes(q);
        const reasonMatch = (s.consultationReason || '').toLowerCase().includes(q);
        const programMatch = (s.studentProgram || '').toLowerCase().includes(q);
        const folioMatch = (s.folio || '').toLowerCase().includes(q);
        if (!studentMatch && !reasonMatch && !programMatch && !folioMatch) return false;
      }

      return true;
    });
  }

  private getSlotKey(slot: Availability): string {
    return `${slot.date}_${slot.startTime}_${slot.id}`;
  }

  isSlotInProgress(slot: Availability): boolean {
    return this.inProgressSlotKeys.has(this.getSlotKey(slot));
  }

  isSlotCompleted(slot: Availability): boolean {
    return this.completedSlotKeys.has(this.getSlotKey(slot));
  }

  setSubTab(tab: P09SubTab): void {
    this.activeSubTab = tab;
  }

  onNewAppointment(): void {
    this.newAppointment.emit();
  }

  onSlotClick(slot: Availability): void {
    this.slotClick.emit(slot);
  }

  onApprove(slot: Availability): void {
    this.approveReschedule.emit(slot);
  }

  onReject(slot: Availability): void {
    this.rejectReschedule.emit(slot);
  }
}
