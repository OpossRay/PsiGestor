import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonRefresher,
  IonRefresherContent,
  ToastController
} from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CalendarService } from '../../core/services/calendar.service';
import { Availability, DisabledSchedule } from '../../core/models/availability.model';
import { AlumnoAgendaViewComponent } from '../../features/alumno/components/alumno-agenda-view/alumno-agenda-view.component';
import { AlumnoAgendaWeekViewComponent } from '../../features/alumno/components/alumno-agenda-week-view/alumno-agenda-week-view.component';
import { StudentBottomNavComponent, StudentNavTab } from '../../features/alumno/components/student-bottom-nav/student-bottom-nav.component';

@Component({
  selector: 'app-alumno',
  templateUrl: './alumno.page.html',
  styleUrls: ['./alumno.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    AlumnoAgendaViewComponent,
    AlumnoAgendaWeekViewComponent,
    StudentBottomNavComponent
  ]
})
export class AlumnoPage implements OnInit {
  authService = inject(AuthService);
  private calendarService = inject(CalendarService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private toastCtrl = inject(ToastController);

  // Pestaña activa (A-02 Vista Día Agendar por defecto al iniciar sesión como alumno)
  activeTab: StudentNavTab = 'agendar';

  // Modo de vista de la agenda del alumno (Día A-02 | Semana A-02b | Mes A-02c)
  calendarViewMode: 'dia' | 'semana' | 'mes' = 'dia';

  // Fecha seleccionada
  selectedDate: Date = new Date();
  selectedSlotId: number | null = null;

  // Datos
  availabilities: Availability[] = [];
  disabledSchedules: DisabledSchedule[] = [];
  isLoading = false;

  // Especialista Asignada (Lic. Mariana Rojas V. - Psicóloga registrada)
  specialistName = 'Lic. Mariana Rojas V.';
  specialistRole = 'Psicología Clínica';
  specialistCubicle = 'Cubículo 2B';
  specialistAvatar = 'MR';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(event?: any): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.calendarService.getAvailabilities().subscribe({
      next: (data) => {
        this.availabilities = data || [];
        this.loadDisabledSchedules(event);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        if (event) event.target.complete();
        this.cdr.detectChanges();
      }
    });
  }

  private loadDisabledSchedules(event?: any): void {
    this.calendarService.getDisabledSchedules().subscribe({
      next: (data) => {
        this.disabledSchedules = data || [];
        this.isLoading = false;
        if (event) event.target.complete();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        if (event) event.target.complete();
        this.cdr.detectChanges();
      }
    });
  }

  onDateChange(newDate: Date): void {
    this.selectedDate = newDate;
    this.selectedSlotId = null;
    this.cdr.detectChanges();
  }

  onSlotSelect(slot: Availability): void {
    this.selectedSlotId = slot.id;
    this.cdr.detectChanges();
  }

  onViewModeChange(mode: 'dia' | 'semana' | 'mes'): void {
    this.calendarViewMode = mode;
    this.cdr.detectChanges();
  }

  onContinueBooking(slot: Availability): void {
    this.selectedSlotId = slot.id;
    // Preparado para el siguiente paso de reserva
  }

  onTabChange(tab: StudentNavTab): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }
}
