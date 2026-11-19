import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  cafeOutline,
  timeOutline,
  syncOutline,
  calendarOutline
} from 'ionicons/icons';
import { Availability, DisabledSchedule } from '../../../../core/models/availability.model';

export interface AgendaTimelineItem {
  key: string;
  type: 'slot' | 'disabled' | 'break';
  startTime: string;
  endTime: string;
  slot?: Availability;
  disabled?: DisabledSchedule;
}

@Component({
  selector: 'app-agenda-day-view',
  templateUrl: './agenda-day-view.component.html',
  styleUrls: ['./agenda-day-view.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner]
})
export class AgendaDayViewComponent {
  @Input() formattedDate = '';
  @Input() statusFilter = 'all';
  @Input() totalDayItemsCount = 0;
  @Input() availableCount = 0;
  @Input() reservedCount = 0;
  @Input() rescheduleCount = 0;
  @Input() timelineItems: AgendaTimelineItem[] = [];
  @Input() isLoading = false;

  @Output() dayChange = new EventEmitter<number>();
  @Output() todayClick = new EventEmitter<void>();
  @Output() filterChange = new EventEmitter<'all' | 'Disponible' | 'Reservado' | 'Reprogramacion pendiente' | 'Cancelado' | 'Inhabilitado'>();
  @Output() slotClick = new EventEmitter<Availability>();
  @Output() bookSlot = new EventEmitter<Availability>();

  constructor() {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      cafeOutline,
      timeOutline,
      syncOutline,
      calendarOutline
    });
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

  formatCardDate(dateStr?: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const shortDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const shortMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${shortDays[d.getDay()]} ${d.getDate()} ${shortMonths[d.getMonth()]}`;
  }

  onSlotSelect(slot?: Availability): void {
    if (slot) this.slotClick.emit(slot);
  }

  onBookClick(slot: Availability, event: Event): void {
    event.stopPropagation();
    this.bookSlot.emit(slot);
  }
}
