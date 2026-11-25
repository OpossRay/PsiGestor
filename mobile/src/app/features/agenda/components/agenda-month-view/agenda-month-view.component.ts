import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, calendarClearOutline } from 'ionicons/icons';
import { Availability } from '../../../../core/models/availability.model';

export interface MonthCalendarCell {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isSelected: boolean;
  isToday: boolean;
  eventCount: number;
  hasReschedule: boolean;
  hasReserved: boolean;
  hasAvailable: boolean;
}

@Component({
  selector: 'app-agenda-month-view',
  templateUrl: './agenda-month-view.component.html',
  styleUrls: ['./agenda-month-view.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class AgendaMonthViewComponent {
  @Input() selectedDate: Date = new Date();
  @Input() availabilities: Availability[] = [];

  @Output() monthChange = new EventEmitter<number>();
  @Output() todayClick = new EventEmitter<void>();
  @Output() dateSelect = new EventEmitter<Date>();
  @Output() slotClick = new EventEmitter<Availability>();
  @Output() bookSlot = new EventEmitter<Availability>();

  readonly monthWeekdayInitials: string[] = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline, calendarClearOutline });
  }

  private formatDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  get todayDayNumber(): number {
    return new Date().getDate();
  }

  get formattedMonthYear(): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const safeDate = this.selectedDate instanceof Date ? this.selectedDate : new Date();
    return `${months[safeDate.getMonth()]} ${safeDate.getFullYear()}`;
  }

  get formattedSelectedDayTitle(): string {
    const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const safeDate = this.selectedDate instanceof Date ? this.selectedDate : new Date();
    const dayName = weekdays[safeDate.getDay()];
    const dayNum = safeDate.getDate();
    const monthName = months[safeDate.getMonth()];
    return `${dayName} ${dayNum} ${monthName}`;
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

  get monthCalendarCells(): MonthCalendarCell[] {
    const safeDate = this.selectedDate instanceof Date ? this.selectedDate : new Date();
    const year = safeDate.getFullYear();
    const month = safeDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1, 12, 0, 0);
    const startOffset = firstDayOfMonth.getDay(); // 0 (Dom) a 6 (Sáb)
    const startDate = new Date(year, month, 1 - startOffset, 12, 0, 0);

    const lastDayOfMonth = new Date(year, month + 1, 0, 12, 0, 0);
    const totalDaysNeeded = startOffset + lastDayOfMonth.getDate();
    const totalCells = totalDaysNeeded > 35 ? 42 : 35;

    const selectedStr = this.formatDateStr(safeDate);
    const todayStr = this.formatDateStr(new Date());

    const allAvails = this.availabilities || [];
    const cells: MonthCalendarCell[] = [];

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      const dateStr = this.formatDateStr(cellDate);
      const dayOfWeek = cellDate.getDay();

      const daySlots = allAvails.filter(a => a.date === dateStr);
      const activeAppointments = daySlots.filter(
        a => a.status === 'Reservado' || a.status === 'Reprogramacion pendiente'
      );
      const availableSlots = daySlots.filter(
        a => a.status === 'Disponible' && !this.isSlotInPast(a)
      );

      const countForBadge = activeAppointments.length > 0 ? activeAppointments.length : availableSlots.length;

      cells.push({
        date: cellDate,
        dateStr,
        dayNumber: cellDate.getDate(),
        isCurrentMonth: cellDate.getMonth() === month,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSelected: dateStr === selectedStr,
        isToday: dateStr === todayStr,
        eventCount: countForBadge,
        hasReschedule: daySlots.some(a => a.status === 'Reprogramacion pendiente'),
        hasReserved: daySlots.some(a => a.status === 'Reservado'),
        hasAvailable: availableSlots.length > 0
      });
    }

    return cells;
  }

  get selectedDayItems(): Availability[] {
    const safeDate = this.selectedDate instanceof Date ? this.selectedDate : new Date();
    const dateStr = this.formatDateStr(safeDate);
    return (this.availabilities || [])
      .filter(i => i.date === dateStr)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }

  formatTime12h(time24?: string): string {
    if (!time24) return '';
    if (time24.toUpperCase().includes('AM') || time24.toUpperCase().includes('PM')) {
      return time24;
    }
    const parts = time24.split(':');
    if (parts.length < 2) return time24;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].substring(0, 2);
    if (isNaN(hours)) return time24;
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hoursStr = String(hours).padStart(2, '0');
    return `${hoursStr}:${minutes} ${period}`;
  }

  getCardSubtitle(slot: Availability): string {
    if (slot.status === 'Reprogramacion pendiente') {
      return 'Solicitud cambio';
    }
    if (slot.status === 'Disponible') {
      return 'Espacio libre para agendar';
    }
    if (slot.status === 'Cancelado') {
      return slot.cancellationReason || 'Cancelada';
    }
    if (slot.modality === 'Online' || slot.modality === 'En línea') {
      return 'Google Meet';
    }
    return 'Presencial';
  }

  onPrevMonth(): void {
    this.monthChange.emit(-1);
  }

  onNextMonth(): void {
    this.monthChange.emit(1);
  }

  onToday(): void {
    this.todayClick.emit();
  }

  onSelectDate(date: Date): void {
    this.dateSelect.emit(date);
  }

  onItemClick(slot: Availability): void {
    if (slot.status === 'Disponible') {
      this.bookSlot.emit(slot);
    } else {
      this.slotClick.emit(slot);
    }
  }
}
