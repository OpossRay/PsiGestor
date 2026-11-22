import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonModal, IonContent } from '@ionic/angular';
import { Availability } from '../../../../core/models/availability.model';

@Component({
  selector: 'app-conflict-modal',
  standalone: true,
  imports: [CommonModule, IonModal, IonContent],
  templateUrl: './conflict-modal.component.html',
  styleUrls: ['./conflict-modal.component.scss']
})
export class ConflictModalComponent {
  @Input() isOpen = false;
  @Input() conflictSlot: Availability | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() rescheduleRequested = new EventEmitter<Availability>();
  @Output() backToModify = new EventEmitter<void>();

  onClose(): void {
    this.closeModal.emit();
  }

  onProposeReschedule(): void {
    if (this.conflictSlot) {
      this.rescheduleRequested.emit(this.conflictSlot);
    }
  }

  onBackToModify(): void {
    this.backToModify.emit();
  }

  getFolio(slot: Availability): string {
    if (slot.folio) return slot.folio;
    const num = (slot.id || '8941').toString().replace(/\D/g, '').slice(-4) || '8941';
    return `PSI-2024-${num}`;
  }

  getFirstName(fullName?: string): string {
    if (!fullName) return 'el Alumno';
    const first = fullName.trim().split(/\s+/)[0];
    return first || 'el Alumno';
  }

  formatFullDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (!year || !month || !day) return dateStr;
      const d = new Date(year, month - 1, day);
      const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${weekdays[d.getDay()]} ${day} ${months[d.getMonth()]}`;
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
