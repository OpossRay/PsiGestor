import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonRefresher,
  IonRefresherContent,
  ToastController
} from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CalendarService } from '../../core/services/calendar.service';
import { Availability, DisabledSchedule, Appointment } from '../../core/models/availability.model';
import { AlumnoAgendaViewComponent } from '../../features/alumno/components/alumno-agenda-view/alumno-agenda-view.component';
import { AlumnoAgendaWeekViewComponent } from '../../features/alumno/components/alumno-agenda-week-view/alumno-agenda-week-view.component';
import { AgendaMonthViewComponent } from '../../features/agenda/components/agenda-month-view/agenda-month-view.component';
import { StudentBookingModalComponent } from '../../features/alumno/components/student-booking-modal/student-booking-modal.component';
import { StudentCancelModalComponent } from '../../features/alumno/components/student-cancel-modal/student-cancel-modal.component';
import { StudentRescheduleModalComponent } from '../../features/alumno/components/student-reschedule-modal/student-reschedule-modal.component';
import { StudentHomeViewComponent } from '../../features/alumno/components/student-home-view/student-home-view.component';
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
    AgendaMonthViewComponent,
    StudentBookingModalComponent,
    StudentCancelModalComponent,
    StudentRescheduleModalComponent,
    StudentHomeViewComponent,
    StudentBottomNavComponent
  ]
})
export class AlumnoPage implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private calendarService = inject(CalendarService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private toastCtrl = inject(ToastController);

  private scheduleSub?: Subscription;

  // Pestaña activa (A-02 Vista Día Agendar por defecto al iniciar sesión como alumno)
  activeTab: StudentNavTab = 'agendar';

  // Modo de vista de la agenda del alumno (Día A-02 | Semana A-02b | Mes A-02c)
  calendarViewMode: 'dia' | 'semana' | 'mes' = 'dia';

  // Fecha seleccionada
  selectedDate: Date = new Date();
  selectedSlotId: number | null = null;

  // Estado del modal de agendamiento
  isBookingModalOpen = false;
  selectedSlotForBooking: Availability | null = null;

  // Estado del modal de cancelación
  isCancelModalOpen = false;
  selectedAppointmentForCancel: Appointment | null = null;

  // Estado del modal de reprogramación
  isRescheduleModalOpen = false;
  selectedAppointmentForReschedule: Appointment | null = null;

  // Datos de disponibilidades
  availabilities: Availability[] = [];
  disabledSchedules: DisabledSchedule[] = [];
  isLoading = false;

  // Citas del alumno autenticado
  studentAppointments: Appointment[] = [];
  isLoadingAppointments = false;
  appointmentsError: string | null = null;

  // Especialista Asignada (Lic. Mariana Rojas V. - Psicóloga registrada)
  specialistName = 'Lic. Mariana Rojas V.';
  specialistRole = 'Psicología Clínica';
  specialistCubicle = 'Cubículo 2B';
  specialistAvatar = 'MR';

  ngOnInit(): void {
    this.authService.refreshPipgStatus().subscribe((pipg) => {
      if (pipg && !pipg.completed) {
        this.activeTab = 'inicio';
      }
      this.cdr.detectChanges();
    });

    this.loadData();
    this.loadStudentAppointments();

    this.scheduleSub = this.calendarService.scheduleChanged$.subscribe(() => {
      this.loadStudentAppointments(false);
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.scheduleSub?.unsubscribe();
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

    // También refrescar citas del alumno en el pull-to-refresh
    this.loadStudentAppointments(false, event);
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

  loadStudentAppointments(showLoading = true, event?: any): void {
    if (showLoading) {
      this.isLoadingAppointments = true;
    }
    this.appointmentsError = null;
    this.cdr.detectChanges();

    this.calendarService.getStudentMyAppointments().subscribe({
      next: (res) => {
        this.studentAppointments = res?.appointments || [];
        this.isLoadingAppointments = false;
        if (event) event.target.complete();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingAppointments = false;
        this.appointmentsError = err.error?.error || 'No fue posible cargar tus citas en este momento.';
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

  async onSlotSelect(slot: Availability): Promise<void> {
    if (!slot || slot.status !== 'Disponible') return;
    if (this.isPipgPending) {
      await this.showPipgRequiredToast();
      return;
    }
    this.selectedSlotId = slot.id;
    this.selectedSlotForBooking = slot;
    this.isBookingModalOpen = true;
    this.cdr.detectChanges();
  }

  onViewModeChange(mode: 'dia' | 'semana' | 'mes'): void {
    this.calendarViewMode = mode;
    this.cdr.detectChanges();
  }

  isViewMode(mode: 'dia' | 'semana' | 'mes'): boolean {
    return this.calendarViewMode === mode;
  }

  async onContinueBooking(slot: Availability): Promise<void> {
    if (!slot || slot.status !== 'Disponible') return;
    if (this.isPipgPending) {
      await this.showPipgRequiredToast();
      return;
    }
    this.selectedSlotId = slot.id;
    this.selectedSlotForBooking = slot;
    this.isBookingModalOpen = true;
    this.cdr.detectChanges();
  }

  closeBookingModal(): void {
    this.isBookingModalOpen = false;
    this.selectedSlotForBooking = null;
    this.cdr.detectChanges();
  }

  onAppointmentBooked(): void {
    this.closeBookingModal();
    this.loadData();
    this.loadStudentAppointments(false);
  }

  openCancelModal(apt: Appointment): void {
    if (!apt) return;
    this.selectedAppointmentForCancel = apt;
    this.isCancelModalOpen = true;
    this.cdr.detectChanges();
  }

  closeCancelModal(): void {
    this.isCancelModalOpen = false;
    this.selectedAppointmentForCancel = null;
    this.cdr.detectChanges();
  }

  onAppointmentCancelled(): void {
    this.closeCancelModal();
    this.showToast('Cita cancelada correctamente.', 'success');
    this.loadStudentAppointments(false);
    this.loadData();
  }

  openRescheduleModal(apt: Appointment): void {
    if (!apt) return;
    this.selectedAppointmentForReschedule = apt;
    this.isRescheduleModalOpen = true;
    this.cdr.detectChanges();
  }

  closeRescheduleModal(): void {
    this.isRescheduleModalOpen = false;
    this.selectedAppointmentForReschedule = null;
    this.cdr.detectChanges();
  }

  onRescheduleRequested(): void {
    this.closeRescheduleModal();
    this.showToast('Solicitud de reprogramación enviada correctamente.', 'success');
    this.loadStudentAppointments(false);
    this.loadData();
  }

  onAcceptReschedule(apt: Appointment): void {
    if (!apt || !apt.id) return;
    this.calendarService.approveStudentReschedule(apt.id).subscribe({
      next: () => {
        this.showToast('Reprogramación aceptada exitosamente.', 'success');
        this.loadStudentAppointments(false);
        this.loadData();
      },
      error: (err) => {
        const msg = err.error?.error || 'No fue posible aceptar la reprogramación.';
        this.showToast(msg, 'danger');
      }
    });
  }

  onRejectReschedule(apt: Appointment): void {
    if (!apt || !apt.id) return;
    const isStudentSelfRequest = apt.reschedule_requested_by === 'alumno';
    this.calendarService.rejectStudentReschedule(apt.id).subscribe({
      next: () => {
        const msg = isStudentSelfRequest
          ? 'Solicitud de reprogramación descartada.'
          : 'Propuesta de reprogramación rechazada.';
        this.showToast(msg, 'success');
        this.loadStudentAppointments(false);
        this.loadData();
      },
      error: (err) => {
        const msg = err.error?.error || 'No fue posible procesar la acción.';
        this.showToast(msg, 'danger');
      }
    });
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    try {
      const toast = await this.toastCtrl.create({
        message,
        duration: 3000,
        color,
        position: 'bottom'
      });
      await toast.present();
    } catch {
      // Fallback si no está en entorno nativo completo
    }
  }

  onMonthChange(offset: number): void {
    const next = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() + offset, 1);
    this.selectedDate = next;
    this.cdr.detectChanges();
  }

  onTodayClick(): void {
    this.selectedDate = new Date();
    this.cdr.detectChanges();
  }

  onTabChange(tab: StudentNavTab): void {
    this.activeTab = tab;
    if (tab === 'inicio' || tab === 'mis-citas') {
      this.loadStudentAppointments(false);
    }
    this.cdr.detectChanges();
  }

  get isPipgPending(): boolean {
    return this.authService.isPipgPending();
  }

  get pipgStatus(): 'not_started' | 'in_progress' | 'completed' {
    return this.authService.pipgState()?.status ?? 'not_started';
  }

  onStartPipg(): void {
    this.router.navigate(['/pipg-test']);
  }

  async showPipgRequiredToast(): Promise<void> {
    try {
      const toast = await this.toastCtrl.create({
        message: 'Para poder solicitar una cita, primero debes completar tu evaluación inicial P-IPG.',
        duration: 4500,
        color: 'warning',
        position: 'bottom',
        buttons: [
          {
            text: 'Comenzar',
            handler: () => {
              this.onStartPipg();
            }
          }
        ]
      });
      await toast.present();
    } catch {
      // Fallback
    }
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
