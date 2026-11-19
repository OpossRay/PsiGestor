import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  timeOutline,
  banOutline,
  pencilOutline,
  closeOutline
} from 'ionicons/icons';

export interface HabitualDay {
  key: string;
  label: string;
  startTime: string;
  endTime: string;
  hoursLabel?: string;
  active: boolean;
}

@Component({
  selector: 'app-habitual-schedule-view',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonModal],
  templateUrl: './habitual-schedule-view.component.html',
  styleUrls: ['./habitual-schedule-view.component.scss']
})
export class HabitualScheduleViewComponent {
  @Input() days: HabitualDay[] = [];
  @Input() duration = '45 minutos';
  @Input() dailyBreak = '01:00 PM – 02:00 PM';

  @Output() back = new EventEmitter<void>();
  @Output() daysChange = new EventEmitter<HabitualDay[]>();
  @Output() durationChange = new EventEmitter<string>();
  @Output() dailyBreakChange = new EventEmitter<string>();
  @Output() save = new EventEmitter<void>();
  @Output() openDisable = new EventEmitter<void>();

  isEditingHours = false;
  editingDay: HabitualDay | null = null;
  tempStartTime = '08:00';
  tempEndTime = '15:00';

  constructor() {
    addIcons({
      arrowBackOutline,
      timeOutline,
      banOutline,
      pencilOutline,
      closeOutline
    });
  }

  onBack(): void {
    this.back.emit();
  }

  onSave(): void {
    this.save.emit();
  }

  onOpenDisable(): void {
    this.openDisable.emit();
  }

  onDurationChange(value: string): void {
    this.duration = value;
    this.durationChange.emit(value);
  }

  onDailyBreakChange(value: string): void {
    this.dailyBreak = value;
    this.dailyBreakChange.emit(value);
  }

  toggleDay(day: HabitualDay): void {
    day.active = !day.active;
    this.daysChange.emit([...this.days]);
  }

  openEditHours(day: HabitualDay): void {
    this.editingDay = day;
    this.tempStartTime = day.startTime || '08:00';
    this.tempEndTime = day.endTime || '15:00';
    this.isEditingHours = true;
  }

  closeEditHours(): void {
    this.isEditingHours = false;
    this.editingDay = null;
  }

  applyHoursToCurrentDay(): void {
    if (this.editingDay) {
      this.editingDay.startTime = this.tempStartTime;
      this.editingDay.endTime = this.tempEndTime;
      this.editingDay.hoursLabel = this.getDayHoursLabel(this.editingDay);
      this.daysChange.emit([...this.days]);
    }
    this.closeEditHours();
  }

  applyHoursToAllActiveDays(): void {
    for (const d of this.days) {
      if (d.active) {
        d.startTime = this.tempStartTime;
        d.endTime = this.tempEndTime;
        d.hoursLabel = this.getDayHoursLabel(d);
      }
    }
    this.daysChange.emit([...this.days]);
    this.closeEditHours();
  }

  getDayHoursLabel(day: HabitualDay): string {
    if (day.startTime && day.endTime) {
      return `${this.formatTime12h(day.startTime)} – ${this.formatTime12h(day.endTime)}`;
    }
    return day.hoursLabel || '08:00 AM – 03:00 PM';
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
