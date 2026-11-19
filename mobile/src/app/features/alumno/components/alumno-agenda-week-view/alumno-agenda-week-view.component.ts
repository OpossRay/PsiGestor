import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Availability, DisabledSchedule } from '../../../../core/models/availability.model';

export interface WeekDayCol {
  date: Date;
  dateStr: string;
  dayLetter: string;
  dayNum: number;
  isToday: boolean;
  isSelected: boolean;
}

export interface MatrixCell {
  hour: string;
  slot: Availability | null;
  status: 'libre' | 'ocupado' | 'selected' | 'none';
}

export interface MatrixRow {
  hourDisplay: string;
  hour: string;
  cells: MatrixCell[];
}

@Component({
  selector: 'app-alumno-agenda-week-view',
  templateUrl: './alumno-agenda-week-view.component.html',
  styleUrls: ['./alumno-agenda-week-view.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class AlumnoAgendaWeekViewComponent implements OnChanges {
  @Input() availabilities: Availability[] = [];
  @Input() disabledSchedules: DisabledSchedule[] = [];
  @Input() selectedDate: Date = new Date();
  @Input() selectedSlotId: number | null = null;
  @Input() isLoading = false;

  @Output() dateChange = new EventEmitter<Date>();
  @Output() slotSelect = new EventEmitter<Availability>();
  @Output() viewModeChange = new EventEmitter<'dia' | 'semana' | 'mes'>();
  @Output() continue = new EventEmitter<Availability>();

  @Input() viewMode: 'dia' | 'semana' | 'mes' = 'semana';

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate'] || changes['availabilities']) {
      // Re-evaluar matriz
    }
  }

  get mondayOfWeek(): Date {
    const d = new Date(this.selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  get weekDays(): WeekDayCol[] {
    const letters = ['L', 'M', 'X', 'J', 'V'];
    const monday = this.mondayOfWeek;
    const todayStr = this.formatDate(new Date());
    const selectedStr = this.formatDate(this.selectedDate);

    const cols: WeekDayCol[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = this.formatDate(d);
      cols.push({
        date: d,
        dateStr,
        dayLetter: letters[i],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedStr
      });
    }
    return cols;
  }

  get weekTitle(): string {
    const monday = this.mondayOfWeek;
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const monMonth = months[monday.getMonth()];
    const friMonth = months[friday.getMonth()];

    if (monday.getMonth() === friday.getMonth()) {
      return `Semana ${monday.getDate()} – ${friday.getDate()} ${friMonth}`;
    }
    return `Semana ${monday.getDate()} ${monMonth} – ${friday.getDate()} ${friMonth}`;
  }

  get freeSlotsCountInWeek(): number {
    const weekDateStrs = new Set(this.weekDays.map(c => c.dateStr));
    return (this.availabilities || []).filter(s =>
      weekDateStrs.has(s.date) &&
      s.status === 'Disponible' &&
      !this.isSlotInPast(s)
    ).length;
  }

  get uniqueHours(): string[] {
    const weekDateStrs = new Set(this.weekDays.map(c => c.dateStr));
    const hoursSet = new Set<string>();

    (this.availabilities || []).forEach(s => {
      if (weekDateStrs.has(s.date) && s.startTime) {
        hoursSet.add(s.startTime.substring(0, 5));
      }
    });

    // Horas por defecto institucionales si no hay suficientes
    if (hoursSet.size === 0) {
      ['09:00', '10:00', '11:00', '12:00', '15:00'].forEach(h => hoursSet.add(h));
    }

    return Array.from(hoursSet).sort();
  }

  get matrixRows(): MatrixRow[] {
    const hours = this.uniqueHours;
    const days = this.weekDays;

    return hours.map(hour => {
      const cells: MatrixCell[] = days.map(day => {
        const slot = (this.availabilities || []).find(s =>
          s.date === day.dateStr &&
          (s.startTime || '').substring(0, 5) === hour
        ) || null;

        let status: 'libre' | 'ocupado' | 'selected' | 'none' = 'none';

        if (slot) {
          if (this.selectedSlotId === slot.id) {
            status = 'selected';
          } else if (slot.status === 'Disponible' && !this.isSlotInPast(slot)) {
            status = 'libre';
          } else {
            status = 'ocupado';
          }
        }

        return {
          hour,
          slot,
          status
        };
      });

      return {
        hourDisplay: hour,
        hour,
        cells
      };
    });
  }

  get selectedSlot(): Availability | null {
    if (!this.selectedSlotId) return null;
    return (this.availabilities || []).find(s => s.id === this.selectedSlotId) || null;
  }

  get currentSelectionText(): string {
    if (!this.selectedSlot) {
      return 'Selecciona un horario libre';
    }
    const [year, month, day] = (this.selectedSlot.date || '').split('-').map(Number);
    if (!year || !month || !day) return 'Selecciona un horario libre';
    const d = new Date(year, month - 1, day);
    const shortDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dayName = shortDays[d.getDay()];
    const time12 = this.formatTime12h(this.selectedSlot.startTime);
    return `Selección actual: ${dayName} ${day} · ${time12}`;
  }

  onCellClick(cell: MatrixCell, day: WeekDayCol): void {
    if (cell.slot && cell.status === 'libre') {
      this.selectedSlotId = cell.slot.id;
      this.selectedDate = day.date;
      this.dateChange.emit(day.date);
      this.slotSelect.emit(cell.slot);
    } else if (cell.slot && cell.status === 'selected') {
      // Toggle
    }
  }

  onDayHeaderClick(day: WeekDayCol): void {
    this.selectedDate = day.date;
    this.dateChange.emit(day.date);
  }

  onContinue(): void {
    if (this.selectedSlot) {
      this.continue.emit(this.selectedSlot);
    }
  }

  setViewMode(mode: 'dia' | 'semana' | 'mes'): void {
    this.viewMode = mode;
    this.viewModeChange.emit(mode);
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
