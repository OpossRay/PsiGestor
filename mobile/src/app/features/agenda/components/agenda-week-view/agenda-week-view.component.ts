import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { Availability, DisabledSchedule } from '../../../../core/models/availability.model';

export interface WeekDayColumn {
  date: Date;
  dateStr: string;
  upperLabel: string;
  dayNumber: number;
  isSelected: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export interface WeekEventBlock {
  key: string;
  variant: 'free' | 'reserved-solid' | 'reserved-soft' | 'reschedule' | 'disabled' | 'break';
  topPx: number;
  line1: string;
  line2?: string;
  line3?: string;
  slot?: Availability;
}

export interface WeekStats {
  citas: number;
  libres: number;
  reprog: number;
  inhab: number;
}

@Component({
  selector: 'app-agenda-week-view',
  templateUrl: './agenda-week-view.component.html',
  styleUrls: ['./agenda-week-view.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class AgendaWeekViewComponent {
  @Input() selectedDate: Date = new Date();
  @Input() availabilities: Availability[] = [];
  @Input() disabledSchedules: DisabledSchedule[] = [];

  @Output() weekChange = new EventEmitter<number>();
  @Output() todayClick = new EventEmitter<void>();
  @Output() dateSelect = new EventEmitter<Date>();
  @Output() slotClick = new EventEmitter<Availability>();
  @Output() bookSlot = new EventEmitter<Availability>();

  readonly weekGridHours: string[] = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00'
  ];

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline });
  }

  private formatDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private getIsoWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  get formattedWeekLabel(): string {
    const shortMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const current = new Date(this.selectedDate);
    const dayOfWeek = current.getDay();
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - dayOfWeek);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    const weekNum = this.getIsoWeekNumber(current);
    const startDay = sunday.getDate();
    const endDay = saturday.getDate();
    const startMonth = shortMonths[sunday.getMonth()];
    const endMonth = shortMonths[saturday.getMonth()];
    const year = saturday.getFullYear();

    if (sunday.getMonth() === saturday.getMonth()) {
      return `Semana ${weekNum} · ${startDay} – ${endDay} ${endMonth} ${year}`;
    }
    return `Semana ${weekNum} · ${startDay} ${startMonth} – ${endDay} ${endMonth} ${year}`;
  }

  get weekDays(): WeekDayColumn[] {
    const labels = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const current = new Date(this.selectedDate);
    const dayOfWeek = current.getDay();
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - dayOfWeek);

    const selectedStr = this.formatDateStr(this.selectedDate);
    const todayStr = this.formatDateStr(new Date());

    const result: WeekDayColumn[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateStr = this.formatDateStr(d);
      result.push({
        date: d,
        dateStr,
        upperLabel: labels[i],
        dayNumber: d.getDate(),
        isSelected: dateStr === selectedStr,
        isToday: dateStr === todayStr,
        isWeekend: i === 0 || i === 6
      });
    }
    return result;
  }

  private computeTopPxForTime(timeStr: string): number {
    const ROW_HEIGHT = 56;
    const clean = (timeStr || '08:00').replace(/\s*(AM|PM)/i, '').trim();
    const parts = clean.split(':');
    let hour = parseInt(parts[0] || '8', 10);
    const min = parseInt((parts[1] || '0').substring(0, 2), 10);

    if (/PM/i.test(timeStr) && hour < 12) hour += 12;
    if (/AM/i.test(timeStr) && hour === 12) hour = 0;

    if (hour < 8) hour = 8;
    let offsetHours = (hour - 8) + (min / 60);
    if (offsetHours > 6.4) {
      offsetHours = 5.45;
    }
    return Math.round(offsetHours * ROW_HEIGHT) + 2;
  }

  private getShortFirstName(fullName?: string): string {
    if (!fullName) return 'Alumno';
    const first = fullName.trim().split(/\s+/)[0];
    return first || 'Alumno';
  }

  private formatTimeShort(timeStr?: string): string {
    if (!timeStr) return '';
    const clean = timeStr.replace(/\s*(AM|PM)/i, '').trim();
    const parts = clean.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return timeStr;
  }

  getWeekDayBlocks(day: WeekDayColumn): WeekEventBlock[] {
    const blocks: WeekEventBlock[] = [];

    const daySlots = this.availabilities
      .filter(i => i.date === day.dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const nonFreeSlots = daySlots.filter(s => s.status !== 'Disponible');
    const freeSlots = daySlots.filter(s => s.status === 'Disponible');

    const slotsToRender = day.isSelected
      ? daySlots
      : (nonFreeSlots.length > 0 ? nonFreeSlots : freeSlots.slice(0, 1));

    for (const slot of slotsToRender) {
      const shortTime = this.formatTimeShort(slot.startTime);
      const topPx = this.computeTopPxForTime(slot.startTime);

      if (slot.status === 'Disponible') {
        blocks.push({
          key: `wk-slot-${slot.id}`,
          variant: 'free',
          topPx,
          line1: `${shortTime} Disp.`,
          slot
        });
      } else if (slot.status === 'Reservado') {
        const firstName = this.getShortFirstName(slot.studentName);
        if (day.isSelected) {
          const locShort = (slot.modality === 'Online' || slot.modality === 'En línea')
            ? 'En línea'
            : 'Cub. 2B';
          blocks.push({
            key: `wk-slot-${slot.id}`,
            variant: 'reserved-solid',
            topPx,
            line1: `${shortTime} ${firstName}`,
            line2: locShort,
            slot
          });
        } else {
          blocks.push({
            key: `wk-slot-${slot.id}`,
            variant: 'reserved-soft',
            topPx,
            line1: `${shortTime} ${slot.studentName ? firstName : 'Cita'}`,
            slot
          });
        }
      } else if (slot.status === 'Reprogramacion pendiente') {
        const firstName = this.getShortFirstName(slot.studentName);
        blocks.push({
          key: `wk-slot-${slot.id}`,
          variant: 'reschedule',
          topPx,
          line1: `${shortTime} ${firstName}`,
          line2: 'Reprog.',
          slot
        });
      } else if (slot.status === 'Inhabilitado') {
        blocks.push({
          key: `wk-slot-${slot.id}`,
          variant: 'disabled',
          topPx,
          line1: shortTime,
          line2: 'Bloqueo',
          line3: (slot.cancellationReason || 'Academia').split(' ')[0],
          slot
        });
      }
    }

    // Agregar inhabilitaciones desde disabledSchedules
    const dayDisabled = this.disabledSchedules.filter(item => {
      if (item.type === 'Puntual') return item.startDate === day.dateStr;
      return day.dateStr >= item.startDate && (!item.endDate || day.dateStr <= item.endDate);
    });

    for (const dis of dayDisabled) {
      const shortTime = this.formatTimeShort(dis.startTime);
      const alreadyIn = blocks.some(b => b.variant === 'disabled' && b.line1 === shortTime);
      if (!alreadyIn) {
        blocks.push({
          key: `wk-dis-${dis.id}`,
          variant: 'disabled',
          topPx: this.computeTopPxForTime(dis.startTime),
          line1: shortTime,
          line2: 'Bloqueo',
          line3: (dis.reason || 'Academia').split(' ')[0]
        });
      }
    }

    // Agregar pastilla de Descanso en el día seleccionado en su hueco libre (12:30 o 10:00)
    if (day.isSelected && daySlots.length > 0) {
      const candidateTimes = ['12:30', '10:00', '13:00'];
      for (const candidate of candidateTimes) {
        const breakTop = this.computeTopPxForTime(candidate);
        const hasCollision = blocks.some(b => Math.abs(b.topPx - breakTop) < 34);
        if (!hasCollision) {
          blocks.push({
            key: `wk-break-${day.dateStr}`,
            variant: 'break',
            topPx: breakTop,
            line1: 'Descanso'
          });
          break;
        }
      }
    }

    return blocks.sort((a, b) => a.topPx - b.topPx);
  }

  get weekStats(): WeekStats {
    const days = this.weekDays.map(d => d.dateStr);
    const weekItems = this.availabilities.filter(i => days.includes(i.date));
    const citas = weekItems.filter(i => i.status === 'Reservado').length;
    const libres = weekItems.filter(i => i.status === 'Disponible').length;
    const reprog = weekItems.filter(i => i.status === 'Reprogramacion pendiente').length;
    const inhab = weekItems.filter(i => i.status === 'Inhabilitado').length + this.disabledSchedules.length;
    return { citas, libres, reprog, inhab };
  }

  onPrevWeek(): void {
    this.weekChange.emit(-1);
  }

  onNextWeek(): void {
    this.weekChange.emit(1);
  }

  onToday(): void {
    this.todayClick.emit();
  }

  onSelectDate(date: Date): void {
    this.dateSelect.emit(date);
  }

  onBlockClick(block: WeekEventBlock, dayDate: Date, event: Event): void {
    event.stopPropagation();
    this.dateSelect.emit(dayDate);
    if (!block.slot) return;
    if (block.slot.status === 'Disponible') {
      this.bookSlot.emit(block.slot);
    } else {
      this.slotClick.emit(block.slot);
    }
  }
}
