import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkOutline,
  lockClosedOutline,
  chevronBackOutline,
  chevronForwardOutline,
  timeOutline,
  calendarOutline
} from 'ionicons/icons';
import { Availability, DisabledSchedule } from '../../../../core/models/availability.model';

@Component({
  selector: 'app-alumno-agenda-view',
  templateUrl: './alumno-agenda-view.component.html',
  styleUrls: ['./alumno-agenda-view.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class AlumnoAgendaViewComponent {
  @Input() specialistName = 'Lic. Mariana Rojas V.';
  @Input() specialistRole = 'Psicología Clínica';
  @Input() specialistCubicle = 'Cubículo 2B';
  @Input() specialistAvatar = 'MR';
  @Input() availabilities: Availability[] = [];
  @Input() disabledSchedules: DisabledSchedule[] = [];
  @Input() selectedDate: Date = new Date();
  @Input() selectedSlotId: number | null = null;
  @Input() isLoading = false;

  @Output() dateChange = new EventEmitter<Date>();
  @Output() slotSelect = new EventEmitter<Availability>();
  @Output() viewModeChange = new EventEmitter<'dia' | 'semana' | 'mes'>();

  @Input() viewMode: 'dia' | 'semana' | 'mes' = 'dia';

  constructor() {
    addIcons({
      checkmarkOutline,
      lockClosedOutline,
      chevronBackOutline,
      chevronForwardOutline,
      timeOutline,
      calendarOutline
    });
  }

  get formattedDateHeader(): string {
    const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayName = weekdays[this.selectedDate.getDay()];
    const dayNum = this.selectedDate.getDate();
    const monthName = months[this.selectedDate.getMonth()];
    return `${dayName}, ${dayNum} ${monthName}`;
  }

  get currentDaySlots(): Availability[] {
    const targetDate = this.formatDate(this.selectedDate);
    return (this.availabilities || [])
      .filter(s => s.date === targetDate)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }

  get freeSlotsCount(): number {
    return this.currentDaySlots.filter(s => s.status === 'Disponible' && !this.isSlotInPast(s)).length;
  }

  onPrevDay(): void {
    const next = new Date(this.selectedDate);
    next.setDate(this.selectedDate.getDate() - 1);
    this.selectedDate = next;
    this.dateChange.emit(next);
  }

  onNextDay(): void {
    const next = new Date(this.selectedDate);
    next.setDate(this.selectedDate.getDate() + 1);
    this.selectedDate = next;
    this.dateChange.emit(next);
  }

  setViewMode(mode: 'dia' | 'semana' | 'mes'): void {
    this.viewMode = mode;
    this.viewModeChange.emit(mode);
  }

  onSelectSlot(slot: Availability): void {
    if (slot.status !== 'Disponible' || this.isSlotInPast(slot)) {
      return;
    }
    this.selectedSlotId = slot.id;
    this.slotSelect.emit(slot);
  }

  isSlotInPast(slot: Availability): boolean {
    if (!slot || !slot.date) return false;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (slot.date < todayStr) return true;
    if (slot.date === todayStr && slot.startTime) {
      const currentTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      return slot.startTime.substring(0, 5) < currentTimeStr;
    }
    return false;
  }

  formatTimeRange(startTime?: string, endTime?: string): string {
    if (!startTime || !endTime) return '';
    return `${this.formatTime12h(startTime)} – ${this.formatTime12h(endTime)}`;
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

  formatDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}
