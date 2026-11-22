import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  radioOutline,
  checkmarkCircleOutline,
  timeOutline,
  play,
  checkmarkDoneOutline,
  folderOpenOutline,
  syncOutline,
  alertCircleOutline,
  arrowForwardOutline,
  videocamOutline,
  businessOutline,
  closeCircleOutline
} from 'ionicons/icons';
import { Availability } from '../../../../core/models/availability.model';

@Component({
  selector: 'app-appointment-card',
  templateUrl: './appointment-card.component.html',
  styleUrls: ['./appointment-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class AppointmentCardComponent {
  @Input({ required: true }) slot!: Availability;
  @Input() isInProgress = false;
  @Input() isCompleted = false;

  @Output() cardClick = new EventEmitter<Availability>();
  @Output() startSession = new EventEmitter<Availability>();
  @Output() completeSession = new EventEmitter<Availability>();
  @Output() detailClick = new EventEmitter<Availability>();
  @Output() approveReschedule = new EventEmitter<Availability>();
  @Output() rejectReschedule = new EventEmitter<Availability>();
  @Output() changeReschedule = new EventEmitter<Availability>();

  constructor() {
    addIcons({
      radioOutline,
      checkmarkCircleOutline,
      timeOutline,
      play,
      checkmarkDoneOutline,
      folderOpenOutline,
      syncOutline,
      alertCircleOutline,
      arrowForwardOutline,
      videocamOutline,
      businessOutline,
      closeCircleOutline
    });
  }

  formatCardDate(dateStr?: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(d.getTime())) return dateStr;

    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (dateStr === todayStr) {
      return `Hoy, ${d.getDate()} ${months[d.getMonth()]}`;
    }
    return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
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

  onCardClick(): void {
    this.cardClick.emit(this.slot);
  }

  onStartSession(event: Event): void {
    event.stopPropagation();
    this.startSession.emit(this.slot);
  }

  onCompleteSession(event: Event): void {
    event.stopPropagation();
    this.completeSession.emit(this.slot);
  }

  onDetailClick(event: Event): void {
    event.stopPropagation();
    this.detailClick.emit(this.slot);
  }

  onApproveReschedule(event: Event): void {
    event.stopPropagation();
    this.approveReschedule.emit(this.slot);
  }

  onRejectReschedule(event: Event): void {
    event.stopPropagation();
    this.rejectReschedule.emit(this.slot);
  }

  onChangeReschedule(event: Event): void {
    event.stopPropagation();
    this.changeReschedule.emit(this.slot);
  }
}
