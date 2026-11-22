import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-header-dark',
  templateUrl: './header-dark.component.html',
  styleUrls: ['./header-dark.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class HeaderDarkComponent {
  @Input() psychologistName = 'Lic. Mariana Rojas V.';
  @Input() psychologistRole = 'Psicóloga Clínica · Cubículo 2B';
  @Input() calendarViewMode: 'dia' | 'semana' | 'mes' = 'dia';
  @Input() monthYearLabel = '';
  @Input() hasNotifications = true;

  @Output() viewModeChange = new EventEmitter<'dia' | 'semana' | 'mes'>();
  @Output() notificationClick = new EventEmitter<void>();

  constructor() {
    addIcons({ notificationsOutline });
  }

  onSelectViewMode(mode: 'dia' | 'semana' | 'mes'): void {
    if (this.calendarViewMode !== mode) {
      this.viewModeChange.emit(mode);
    }
  }

  onNotificationClick(): void {
    this.notificationClick.emit();
  }
}
