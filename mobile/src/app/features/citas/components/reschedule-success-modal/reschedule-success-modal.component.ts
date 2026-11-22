import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonModal, IonContent } from '@ionic/angular';
import { Availability } from '../../../../core/models/availability.model';

@Component({
  selector: 'app-reschedule-success-modal',
  templateUrl: './reschedule-success-modal.component.html',
  styleUrls: ['./reschedule-success-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonModal, IonContent]
})
export class RescheduleSuccessModalComponent {
  @Input() isOpen = false;
  @Input() slot: Availability | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() goToAgenda = new EventEmitter<void>();

  isFemale(name?: string): boolean {
    if (!name) return false;
    const first = name.trim().split(/\s+/)[0].toLowerCase();
    const femaleNames = ['sofia', 'sofía', 'maria', 'maría', 'ana', 'laura', 'valeria', 'camila', 'daniela', 'paola', 'andrea', 'fernanda'];
    return femaleNames.includes(first) || first.endsWith('a');
  }

  formatNewSchedule(slot: Availability | null): string {
    if (!slot) return 'Vie 25 Oct · 11:00 AM – 11:45 AM';
    const dateStr = slot.proposedDate || slot.date;
    const startTime = slot.proposedStartTime || slot.startTime;
    const endTime = slot.proposedEndTime || slot.endTime;

    try {
      const [year, month, day] = (dateStr || '').split('-').map(Number);
      if (!year || !month || !day) return `${dateStr} · ${startTime} – ${endTime}`;
      const d = new Date(year, month - 1, day);
      const shortDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const shortMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const dayName = shortDays[d.getDay()];
      const monthName = shortMonths[d.getMonth()];
      const timeStr = startTime && endTime
        ? ` · ${this.formatTime12h(startTime)} – ${this.formatTime12h(endTime)}`
        : '';
      return `${dayName} ${day} ${monthName}${timeStr}`;
    } catch {
      return `${dateStr} · ${startTime || ''} – ${endTime || ''}`;
    }
  }

  formatModality(slot: Availability | null): string {
    if (!slot) return 'Presencial (Cubículo 2B)';
    const isOnline = slot.modality === 'Online' || slot.modality === 'En línea';
    if (isOnline) {
      return 'En línea (Videollamada)';
    }
    const loc = slot.location ? slot.location : 'Cubículo 2B';
    return `Presencial (${loc})`;
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

  onClose(): void {
    this.closeModal.emit();
  }

  onGoToAgenda(): void {
    this.goToAgenda.emit();
  }
}
