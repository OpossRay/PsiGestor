import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonModal, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, calendarOutline, alertCircleOutline } from 'ionicons/icons';
import { Availability, InvalidationReason } from '../../../../core/models/availability.model';
import { BottomNavComponent, BottomNavTab } from '../../../../shared/components/bottom-nav/bottom-nav.component';

export interface DisableFormPayload {
  date: string;
  startTime: string;
  endTime: string;
  reason: InvalidationReason;
  observation: string;
}

@Component({
  selector: 'app-inhabilitar-horario-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonModal, IonContent, IonIcon, BottomNavComponent],
  templateUrl: './inhabilitar-horario-modal.component.html',
  styleUrls: ['./inhabilitar-horario-modal.component.scss']
})
export class InhabilitarHorarioModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() selectedDate: string = '';
  @Input() allAvailabilities: Availability[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() confirmDisable = new EventEmitter<DisableFormPayload>();
  @Output() conflictFound = new EventEmitter<Availability>();
  @Output() tabSelect = new EventEmitter<BottomNavTab>();

  readonly institutionalReasons: Array<{ value: InvalidationReason; label: string }> = [
    { value: 'Evento académico', label: 'Comisión o Evento Institucional' },
    { value: 'Reunión', label: 'Reunión de Academia / Coordinación' },
    { value: 'Actividad personal', label: 'Permiso Económico / Asunto Personal' },
    { value: 'Comida', label: 'Franja Extraordinaria de Alimentos' },
    { value: 'Emergencia', label: 'Incapacidad Médica o Emergencia' },
    { value: 'Otro motivo', label: 'Otro Motivo Justificado' }
  ];

  form: DisableFormPayload = {
    date: '',
    startTime: '10:00',
    endTime: '12:00',
    reason: 'Evento académico',
    observation: ''
  };

  constructor() {
    addIcons({
      arrowBackOutline,
      calendarOutline,
      alertCircleOutline
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate'] && this.selectedDate) {
      this.form.date = this.selectedDate;
    }
    if (changes['isOpen'] && this.isOpen) {
      if (!this.form.date && this.selectedDate) {
        this.form.date = this.selectedDate;
      }
      if (!this.form.date) {
        const today = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        this.form.date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      }
    }
  }

  get conflictingSlots(): Availability[] {
    if (!this.form.date || !this.form.startTime || !this.form.endTime) return [];
    const targetDate = this.form.date;
    const start = this.form.startTime.substring(0, 5);
    const end = this.form.endTime.substring(0, 5);

    return this.allAvailabilities.filter(slot => {
      if (slot.date !== targetDate) return false;
      if (slot.status !== 'Reservado' && slot.status !== 'Reprogramacion pendiente') return false;
      const sStart = (slot.startTime || '').substring(0, 5);
      const sEnd = (slot.endTime || '').substring(0, 5);
      return sStart < end && sEnd > start;
    });
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.conflictingSlots.length > 0) {
      this.conflictFound.emit(this.conflictingSlots[0]);
    } else {
      this.confirmDisable.emit({ ...this.form });
    }
  }

  onNavTab(tab: BottomNavTab): void {
    this.tabSelect.emit(tab);
  }

  formatFullDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (!year || !month || !day) return dateStr;
      const d = new Date(year, month - 1, day);
      const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${weekdays[d.getDay()]} ${day} de ${months[d.getMonth()]}, ${year}`;
    } catch {
      return dateStr;
    }
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
}
