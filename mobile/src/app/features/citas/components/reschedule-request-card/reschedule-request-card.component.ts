import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkOutline, closeOutline, timeOutline, checkmarkCircle } from 'ionicons/icons';
import { Availability } from '../../../../core/models/availability.model';

@Component({
  selector: 'app-reschedule-request-card',
  templateUrl: './reschedule-request-card.component.html',
  styleUrls: ['./reschedule-request-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class RescheduleRequestCardComponent {
  @Input() slot!: Availability;
  @Input() allAvailabilities: Availability[] = [];

  @Output() approve = new EventEmitter<Availability>();
  @Output() reject = new EventEmitter<Availability>();
  @Output() cardClick = new EventEmitter<Availability>();

  constructor() {
    addIcons({
      checkmarkOutline,
      closeOutline,
      timeOutline,
      checkmarkCircle
    });
  }

  getStudentInitials(name?: string): string {
    if (!name) return 'AL';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleanWord(parts[0]).substring(0, 2).toUpperCase();

    function cleanWord(w: string): string {
      return w ? w.replace(/[^a-zA-Z]/g, '') : 'AL';
    }
  }

  getStudentDetail(slot: Availability): string {
    const matricula = slot.folio ? slot.folio.replace('PSI-', '').slice(0, 8) : '6519–ISC';
    const semester = slot.studentSemester || (slot.studentAge ? `${slot.studentAge}to Semestre` : '5to Semestre');
    const program = slot.studentProgram ? `–${slot.studentProgram.substring(0, 3).toUpperCase()}` : '';
    return `${matricula}${program} · ${semester}`;
  }

  isFemale(name?: string): boolean {
    if (!name) return false;
    const first = name.trim().split(/\s+/)[0].toLowerCase();
    const femaleNames = ['sofia', 'sofía', 'maria', 'maría', 'ana', 'laura', 'valeria', 'camila', 'daniela', 'paola', 'andrea', 'fernanda'];
    return femaleNames.includes(first) || first.endsWith('a');
  }

  formatP09Date(dateStr?: string, startTime?: string, endTime?: string): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (!year || !month || !day) return dateStr;
      const d = new Date(year, month - 1, day);
      const shortDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const shortMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const dayName = shortDays[d.getDay()];
      const monthName = shortMonths[d.getMonth()];
      const timeStr = startTime && endTime
        ? `, ${this.formatTime12h(startTime)} – ${this.formatTime12h(endTime)}`
        : '';
      return `${dayName} ${day} ${monthName}${timeStr}`;
    } catch {
      return `${dateStr} ${startTime || ''} - ${endTime || ''}`;
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

  getStudentReason(slot: Availability): string {
    if (slot.cancellationObservation) return slot.cancellationObservation;
    if (slot.cancellationReason) return slot.cancellationReason;
    if (slot.consultationReason) return slot.consultationReason;
    return 'Presento examen parcial de Simulación en el horario fijado previamente. Solicito amablemente el cambio.';
  }

  get isProposedSlotFree(): boolean {
    if (!this.slot.proposedDate || !this.slot.proposedStartTime) {
      return true;
    }
    const targetDate = this.slot.proposedDate;
    const targetStart = this.slot.proposedStartTime.substring(0, 5);

    // Si hay un espacio en conflicto reservado en esa misma fecha y hora
    const conflict = (this.allAvailabilities || []).find(s =>
      s.id !== this.slot.id &&
      s.date === targetDate &&
      s.status === 'Reservado' &&
      (s.startTime || '').substring(0, 5) === targetStart
    );
    return !conflict;
  }

  onApprove(event: Event): void {
    event.stopPropagation();
    this.approve.emit(this.slot);
  }

  onReject(event: Event): void {
    event.stopPropagation();
    this.reject.emit(this.slot);
  }

  onCardClick(): void {
    this.cardClick.emit(this.slot);
  }
}
