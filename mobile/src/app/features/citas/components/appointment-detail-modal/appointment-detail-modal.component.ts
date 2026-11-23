import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonModal, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, videocamOutline, businessOutline } from 'ionicons/icons';
import { Availability } from '../../../../core/models/availability.model';
import { BottomNavComponent, BottomNavTab } from '../../../../shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-appointment-detail-modal',
  standalone: true,
  imports: [CommonModule, IonModal, IonContent, IonIcon, BottomNavComponent],
  templateUrl: './appointment-detail-modal.component.html',
  styleUrls: ['./appointment-detail-modal.component.scss']
})
export class AppointmentDetailModalComponent {
  @Input() isOpen = false;
  @Input() slot: Availability | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() reschedule = new EventEmitter<Availability>();
  @Output() cancel = new EventEmitter<Availability>();
  @Output() tabSelect = new EventEmitter<BottomNavTab>();

  constructor() {
    addIcons({
      arrowBackOutline,
      videocamOutline,
      businessOutline
    });
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onReschedule(): void {
    if (this.slot) {
      this.reschedule.emit(this.slot);
    }
  }

  onCancel(): void {
    if (this.slot) {
      this.cancel.emit(this.slot);
    }
  }

  onNavTab(tab: BottomNavTab): void {
    this.tabSelect.emit(tab);
  }

  getFolio(slot: Availability): string {
    if (slot.folio) return slot.folio;
    const num = (slot.id || '8941').toString().replace(/\D/g, '').slice(-4) || '8941';
    return `PSI-2024-${num}`;
  }

  getStudentInitials(slot: Availability): string {
    const name = slot.studentName || 'Mateo Fernández Gómez';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || 'A').toUpperCase();
  }

  getStudentEmail(slot: Availability): string {
    const anySlot = slot as any;
    if (anySlot?.studentEmail) return anySlot.studentEmail;
    const name = (slot.studentName || 'mateo fernandez')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '.');
    return `${name}@itescam.edu.mx`;
  }

  formatCardDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (!year || !month || !day) return dateStr;
      const d = new Date(year, month - 1, day);
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${days[d.getDay()]}, ${day} ${months[d.getMonth()]} ${year}`;
    } catch {
      return dateStr;
    }
  }

  formatTime12h(timeStr: string): string {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ? mStr.padStart(2, '0') : '00';
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return `${h12}:${m} ${period}`;
  }
}
