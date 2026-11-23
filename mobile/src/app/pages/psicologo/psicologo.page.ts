import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  calendarOutline,
  calendar,
  chevronBackOutline,
  chevronForwardOutline,
  todayOutline,
  addOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  banOutline,
  personOutline,
  peopleOutline,
  people,
  timeOutline,
  refreshOutline,
  schoolOutline,
  locationOutline,
  documentTextOutline,
  syncOutline,
  searchOutline,
  closeOutline,
  arrowForwardOutline,
  radioOutline,
  homeOutline,
  home,
  menuOutline,
  notificationsOutline,
  clipboardOutline,
  folderOutline,
  chatboxOutline,
  ellipsisHorizontal,
  ellipsisHorizontalOutline,
  settingsOutline,
  helpCircleOutline,
  informationCircleOutline,
  playOutline,
  play,
  checkmarkDoneOutline,
  optionsOutline,
  videocamOutline,
  businessOutline,
  hourglassOutline,
  arrowBackOutline,
  folderOpenOutline,
  chatbubbleEllipsesOutline,
  cafeOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { CalendarService } from '../../core/services/calendar.service';
import { Availability, DisabledSchedule, InvalidationReason, Student } from '../../core/models/availability.model';
import { HeaderDarkComponent } from '../../shared/components/header-dark/header-dark.component';
import { BottomNavComponent, BottomNavTab } from '../../shared/components/bottom-nav/bottom-nav.component';
import { AgendaDayViewComponent } from '../../features/agenda/components/agenda-day-view/agenda-day-view.component';
import { AgendaWeekViewComponent } from '../../features/agenda/components/agenda-week-view/agenda-week-view.component';
import { AgendaMonthViewComponent } from '../../features/agenda/components/agenda-month-view/agenda-month-view.component';
import { GestionCitasViewComponent } from '../../features/citas/components/gestion-citas-view/gestion-citas-view.component';
import { AppointmentDetailModalComponent } from '../../features/citas/components/appointment-detail-modal/appointment-detail-modal.component';
import { BookingModalComponent } from '../../features/citas/components/booking-modal/booking-modal.component';
import { RescheduleModalComponent } from '../../features/citas/components/reschedule-modal/reschedule-modal.component';
import { CancelModalComponent } from '../../features/citas/components/cancel-modal/cancel-modal.component';
import { HabitualScheduleViewComponent, HabitualDay } from '../../features/disponibilidad/components/habitual-schedule-view/habitual-schedule-view.component';
import { InhabilitarHorarioModalComponent, DisableFormPayload } from '../../features/disponibilidad/components/inhabilitar-horario-modal/inhabilitar-horario-modal.component';
import { ConflictModalComponent } from '../../features/disponibilidad/components/conflict-modal/conflict-modal.component';
import { RescheduleSuccessModalComponent } from '../../features/citas/components/reschedule-success-modal/reschedule-success-modal.component';



@Component({
  selector: 'app-psicologo',
  templateUrl: './psicologo.page.html',
  styleUrls: ['./psicologo.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    HeaderDarkComponent,
    BottomNavComponent,
    AgendaDayViewComponent,
    AgendaWeekViewComponent,
    AgendaMonthViewComponent,
    GestionCitasViewComponent,
    AppointmentDetailModalComponent,
    BookingModalComponent,
    RescheduleModalComponent,
    CancelModalComponent,
    HabitualScheduleViewComponent,
    InhabilitarHorarioModalComponent,
    ConflictModalComponent,
    RescheduleSuccessModalComponent
  ]
})
export class PsicologoPage implements OnInit {
  authService = inject(AuthService);
  private calendarService = inject(CalendarService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private toastCtrl = inject(ToastController);

  // Pestaña activa en el panel del psicólogo (P-02 Agenda · Vista Día por defecto al iniciar sesión)
  activeTab: 'inicio' | 'agenda' | 'gestion-citas' | 'disponibilidad' | 'estudiantes' | 'mas' = 'agenda';

  // Modo de vista de Mi Agenda (P-02 Día | P-03 Semana | P-04 Mes)
  calendarViewMode: 'dia' | 'semana' | 'mes' = 'dia';

  // Filtros de Gestión de Citas (Enfoque Operativo)
  gestionStatusFilter: 'todos' | 'confirmadas' | 'reprogramadas' | 'historial' = 'todos';
  gestionModalityFilter: 'all' | 'Presencial' | 'En línea' = 'all';
  gestionSearchQuery = '';

  // Ciclo de vida de citas en sesión / concluidas (evita que queden en el olvido)
  inProgressSlotKeys: Set<string> = new Set();
  completedSlotKeys: Set<string> = new Set();

  // Fecha seleccionada
  selectedDate: Date = new Date();
  
  // Datos
  availabilities: Availability[] = [];
  disabledSchedules: DisabledSchedule[] = [];
  isLoading = false;

  // Filtro en P-02 Agenda
  statusFilter: 'all' | 'Disponible' | 'Reservado' | 'Reprogramacion pendiente' | 'Cancelado' | 'Inhabilitado' = 'all';

  // Modal Activo
  activeModal: 'none' | 'disable' | 'disableConflict' | 'booking' | 'details' | 'cancel' | 'reschedule' | 'rescheduleDetails' | 'cancelDetails' | 'rescheduleSuccess' = 'none';
  selectedSlot: Availability | null = null;
  selectedConflictSlot: Availability | null = null;
  approvedRescheduleSlot: Availability | null = null;

  // Formulario Inhabilitar (P-07)
  


  // Formulario Cancelar
  cancelForm = {
    reason: 'Fuerza mayor',
    observation: ''
  };

  // Formulario Reprogramar
  rescheduleForm = {
    newDate: this.formatDate(new Date()),
    newSlotId: null as number | null,
    selectedNewSlot: null as Availability | null,
    reason: 'Ajuste de agenda psicopedagógica'
  };

  readonly invalidationReasons: InvalidationReason[] = [
    'Reunión',
    'Comida',
    'Actividad personal',
    'Evento académico',
    'Emergencia',
    'Otro motivo'
  ];

  constructor() {
    addIcons({
      logOutOutline,
      calendarOutline,
      calendar,
      chevronBackOutline,
      chevronForwardOutline,
      todayOutline,
      addOutline,
      closeCircleOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      banOutline,
      personOutline,
      peopleOutline,
      people,
      timeOutline,
      refreshOutline,
      schoolOutline,
      locationOutline,
      documentTextOutline,
      syncOutline,
      searchOutline,
      closeOutline,
      arrowForwardOutline,
      radioOutline,
      homeOutline,
      home,
      menuOutline,
      notificationsOutline,
      clipboardOutline,
      folderOutline,
      chatboxOutline,
      ellipsisHorizontal,
      ellipsisHorizontalOutline,
      settingsOutline,
      helpCircleOutline,
      informationCircleOutline,
      playOutline,
      play,
      checkmarkDoneOutline,
      optionsOutline,
      videocamOutline,
      businessOutline,
      hourglassOutline,
      arrowBackOutline,
      folderOpenOutline,
      chatbubbleEllipsesOutline,
      cafeOutline
    });
    this.loadSessionStatesFromStorage();
  }

  ngOnInit(): void {
    this.loadSessionStatesFromStorage();
    this.loadData();
  }

  formatTime12h(timeStr?: string): string {
    return this.formatTimeShort(timeStr || '');
  }

  formatTimeShort(timeStr: string): string {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ? mStr.padStart(2, '0') : '00';
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return h12 + ':' + m + ' ' + period;
  }

  private loadSessionStatesFromStorage(): void {
    try {
      const inProg = localStorage.getItem('psigestor_in_progress_slots');
      const comp = localStorage.getItem('psigestor_completed_slots');
      if (inProg) this.inProgressSlotKeys = new Set(JSON.parse(inProg));
      if (comp) this.completedSlotKeys = new Set(JSON.parse(comp));
    } catch {
      // Ignore storage errors
    }
  }

  private saveSessionStatesToStorage(): void {
    try {
      localStorage.setItem('psigestor_in_progress_slots', JSON.stringify(Array.from(this.inProgressSlotKeys)));
      localStorage.setItem('psigestor_completed_slots', JSON.stringify(Array.from(this.completedSlotKeys)));
    } catch {
      // Ignore storage errors
    }
  }

  getSlotKey(slot: Availability): string {
    return `${slot.id}_${slot.date}_${slot.startTime}`;
  }

  isSlotInProgress(slot: Availability): boolean {
    return this.inProgressSlotKeys.has(this.getSlotKey(slot));
  }

  isSlotCompleted(slot: Availability): boolean {
    return this.completedSlotKeys.has(this.getSlotKey(slot));
  }

  async startAppointmentSession(slot: Availability, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    const key = this.getSlotKey(slot);
    this.inProgressSlotKeys.add(key);
    this.saveSessionStatesToStorage();
    this.cdr.detectChanges();
    await this.showToast(`Cita iniciada con ${slot.studentName || 'el estudiante'}.`, 'success');
  }

  async completeAppointmentSession(slot: Availability, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    const key = this.getSlotKey(slot);
    this.inProgressSlotKeys.delete(key);
    this.completedSlotKeys.add(key);
    this.saveSessionStatesToStorage();
    this.cdr.detectChanges();
    await this.showToast(`Cita con ${slot.studentName || 'el estudiante'} concluida y archivada en Historial.`, 'success');
  }

  get psychologistDisplayName(): string {
    const user = this.authService.currentUser();
    if (user?.name && user.name.trim().length > 0) {
      return user.name;
    }
    return 'Lic. Mariana Rojas V.';
  }

  setTab(tab: 'inicio' | 'agenda' | 'gestion-citas' | 'disponibilidad' | 'estudiantes' | 'mas'): void {
    this.activeTab = tab;
    if (tab === 'agenda') {
      this.statusFilter = 'all';
    }
    this.cdr.detectChanges();
  }

  setCalendarViewMode(mode: 'dia' | 'semana' | 'mes'): void {
    this.calendarViewMode = mode;
    this.cdr.detectChanges();
  }

  openAgenda(filter: 'all' | 'Disponible' | 'Reservado' | 'Reprogramacion pendiente' | 'Cancelado' | 'Inhabilitado' = 'all'): void {
    this.statusFilter = filter;
    this.activeTab = 'agenda';
    this.cdr.detectChanges();
  }

  openGestionCitas(filter: 'todos' | 'confirmadas' | 'reprogramadas' | 'historial' = 'todos'): void {
    this.gestionStatusFilter = filter;
    this.activeTab = 'gestion-citas';
    this.cdr.detectChanges();
  }

  onQuickModuleClick(moduleName: string): void {
    if (moduleName === 'agenda') {
      this.openAgenda('all');
    } else if (moduleName === 'citas') {
      this.openGestionCitas('todos');
    } else if (moduleName === 'estudiantes') {
      this.setTab('estudiantes');
    } else {
      this.openAgenda('all');
    }
  }

  get todayAppointments(): Availability[] {
    const todayStr = this.formatDate(new Date());
    return this.availabilities
      .filter(item =>
        item.date === todayStr &&
        (item.status === 'Reservado' || item.status === 'Reprogramacion pendiente') &&
        !this.isSlotCompleted(item)
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // Métricas dinámicas del Banner de Gestión de Citas
  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top',
      icon: color === 'success' ? 'checkmark-circle-outline' : (color === 'warning' ? 'alert-circle-outline' : 'close-circle-outline')
    });
    await toast.present();
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

  // Navegación
  changeDay(offset: number): void {
    const nextDate = new Date(this.selectedDate);
    nextDate.setDate(nextDate.getDate() + offset);
    this.selectedDate = nextDate;
      }

  changeWeek(weekOffset: number): void {
    const nextDate = new Date(this.selectedDate);
    nextDate.setDate(nextDate.getDate() + weekOffset * 7);
    this.selectedDate = nextDate;
        this.cdr.detectChanges();
  }

  selectDate(d: Date): void {
    this.selectedDate = new Date(d);
        this.cdr.detectChanges();
  }

  get weekDays(): { date: Date; shortLabel: string; dayNumber: number; isSelected: boolean }[] {
    const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const current = new Date(this.selectedDate);
    const dayOfWeek = current.getDay(); // 0 = Dom .. 6 = Sáb
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - dayOfWeek);

    const selectedStr = this.formatDate(this.selectedDate);
    const result: { date: Date; shortLabel: string; dayNumber: number; isSelected: boolean }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      result.push({
        date: d,
        shortLabel: labels[i],
        dayNumber: d.getDate(),
        isSelected: this.formatDate(d) === selectedStr
      });
    }
    return result;
  }

  get formattedMonthYear(): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[this.selectedDate.getMonth()]} ${this.selectedDate.getFullYear()}`;
  }

  get formattedDayHeading(): string {
    const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const dayName = weekdays[this.selectedDate.getDay()];
    const dayNum = this.selectedDate.getDate();
    const monthName = months[this.selectedDate.getMonth()];
    return `${dayName}, ${dayNum} de ${monthName}`;
  }

  goToToday(): void {
    this.selectedDate = new Date();
      }

  formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get formattedSelectedDate(): string {
    return this.selectedDate.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  get formattedP02Date(): string {
    const shortDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const dayLabel = shortDays[this.selectedDate.getDay()];
    const dayNum = this.selectedDate.getDate();
    const monthLabel = months[this.selectedDate.getMonth()];
    const year = this.selectedDate.getFullYear();
    return `${dayLabel}, ${dayNum} ${monthLabel} ${year}`;
  }

  // ============================================================
  // P-03 AGENDA · VISTA SEMANA (GETTERS Y BLOQUES DEL GRID)
  // ============================================================
  readonly weekGridHours: string[] = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00'
  ];

  private getIsoWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  get formattedP03WeekLabel(): string {
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

  get weekDaysP03(): Array<{
    date: Date;
    dateStr: string;
    upperLabel: string;
    dayNumber: number;
    isSelected: boolean;
    isToday: boolean;
    isWeekend: boolean;
  }> {
    const labels = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const current = new Date(this.selectedDate);
    const dayOfWeek = current.getDay();
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - dayOfWeek);

    const selectedStr = this.formatDate(this.selectedDate);
    const todayStr = this.formatDate(new Date());

    const result: Array<{
      date: Date;
      dateStr: string;
      upperLabel: string;
      dayNumber: number;
      isSelected: boolean;
      isToday: boolean;
      isWeekend: boolean;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateStr = this.formatDate(d);
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
    // Cada hora en el grid de 08:00 a 14:00 mide 56px de alto
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

  getShortFirstName(fullName?: string): string {
    if (!fullName) return 'Alumno';
    const first = fullName.trim().split(/\s+/)[0];
    return first || 'Alumno';
  }

  getWeekDayBlocks(day: { dateStr: string; isSelected: boolean }): Array<{
    key: string;
    variant: 'free' | 'reserved-solid' | 'reserved-soft' | 'reschedule' | 'disabled' | 'break';
    topPx: number;
    line1: string;
    line2?: string;
    line3?: string;
    slot?: Availability;
  }> {
    const blocks: Array<{
      key: string;
      variant: 'free' | 'reserved-solid' | 'reserved-soft' | 'reschedule' | 'disabled' | 'break';
      topPx: number;
      line1: string;
      line2?: string;
      line3?: string;
      slot?: Availability;
    }> = [];

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

  onWeekBlockClick(
    block: { variant: string; slot?: Availability },
    dayDate: Date,
    event: Event
  ): void {
    event.stopPropagation();
    this.selectDate(dayDate);
    if (!block.slot) return;
    if (block.slot.status === 'Disponible') {
      this.openBookingModal(block.slot);
    } else {
      this.onSlotClick(block.slot);
    }
  }

  get weekStatsP03(): { citas: number; libres: number; reprog: number; inhab: number } {
    const days = this.weekDaysP03.map(d => d.dateStr);
    const weekItems = this.availabilities.filter(i => days.includes(i.date));
    const citas = weekItems.filter(i => i.status === 'Reservado').length;
    const libres = weekItems.filter(i => i.status === 'Disponible').length;
    const reprog = weekItems.filter(i => i.status === 'Reprogramacion pendiente').length;
    const inhab = weekItems.filter(i => i.status === 'Inhabilitado').length + this.disabledSchedules.length;
    return { citas, libres, reprog, inhab };
  }

  // ============================================================
  // P-04 AGENDA · VISTA MES (CALENDARIO MENSUAL Y CITAS DEL DÍA)
  // ============================================================
  readonly monthWeekdayInitials: string[] = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  changeMonth(monthOffset: number): void {
    const nextDate = new Date(
      this.selectedDate.getFullYear(),
      this.selectedDate.getMonth() + monthOffset,
      Math.min(
        this.selectedDate.getDate(),
        new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() + monthOffset + 1, 0).getDate()
      )
    );
    this.selectedDate = nextDate;
        this.cdr.detectChanges();
  }

  get todayDayNumber(): number {
    return new Date().getDate();
  }

  get formattedP04SelectedDayTitle(): string {
    const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const dayName = weekdays[this.selectedDate.getDay()];
    const dayNum = this.selectedDate.getDate();
    const monthName = months[this.selectedDate.getMonth()];
    return `${dayName} ${dayNum} ${monthName}`;
  }

  get monthCalendarCells(): Array<{
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
  }> {
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startOffset = firstDayOfMonth.getDay(); // 0 (Dom) a 6 (Sáb)
    const startDate = new Date(year, month, 1 - startOffset);

    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDaysNeeded = startOffset + lastDayOfMonth.getDate();
    const totalCells = totalDaysNeeded > 35 ? 42 : 35;

    const selectedStr = this.formatDate(this.selectedDate);
    const todayStr = this.formatDate(new Date());

    const cells: Array<{
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
    }> = [];

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      const dateStr = this.formatDate(cellDate);
      const dayOfWeek = cellDate.getDay();

      const daySlots = this.availabilities.filter(a => a.date === dateStr);
      const activeAppointments = daySlots.filter(
        a => a.status === 'Reservado' || a.status === 'Reprogramacion pendiente'
      );
      const countForBadge = activeAppointments.length > 0 ? activeAppointments.length : daySlots.length;

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
        hasReserved: daySlots.some(a => a.status === 'Reservado')
      });
    }

    return cells;
  }

  get monthSelectedDayItems(): Availability[] {
    const dateStr = this.formatDate(this.selectedDate);
    const allDaySlots = this.availabilities
      .filter(i => i.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const appointmentsOnly = allDaySlots.filter(
      i => i.status === 'Reservado' || i.status === 'Reprogramacion pendiente' || i.status === 'Cancelado'
    );

    if (appointmentsOnly.length > 0) {
      return appointmentsOnly;
    }
    return allDaySlots;
  }

  getP04CardSubtitle(slot: Availability): string {
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

  // ============================================================
  // P-05 DETALLE DE CITA RESERVADA (HELPERS DE FORMATO)
  // ============================================================
  formatP05Date(dateStr?: string): string {
    if (!dateStr) return this.formattedP02Date;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const shortDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${shortDays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  getP05StudentInitials(slot?: Availability | null): string {
    if (slot?.studentInitials) return slot.studentInitials;
    const name = (slot?.studentName || 'Alumno Registrado').trim();
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getP05StudentEmail(slot?: Availability | null): string {
    const rawName = (slot?.studentName || 'alumno.itescam').trim().toLowerCase();
    const normalized = rawName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '');
    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}.${parts[1]}@itescam.edu.mx`;
    }
    return `${parts[0] || 'alumno'}@itescam.edu.mx`;
  }

  getP05Folio(slot?: Availability | null): string {
    if (slot?.folio && slot.folio.startsWith('PSI-')) {
      return slot.folio;
    }
    const year = (slot?.date || '2024').substring(0, 4);
    const num = 8940 + (slot?.id || 1);
    return `PSI-${year}-${num}`;
  }

  navigateFromModal(tab: 'agenda' | 'gestion-citas' | 'disponibilidad' | 'mas'): void {
    this.closeModal();
    if (tab === 'gestion-citas') {
      this.openGestionCitas();
    } else {
      this.setTab(tab);
    }
  }

  onBottomNavTabChange(tab: BottomNavTab): void {
    if (tab === 'gestion-citas') {
      this.openGestionCitas();
    } else {
      this.setTab(tab);
    }
  }

  // ============================================================
  // P-06 DISPONIBILIDAD HABITUAL (HU-M02)
  // ============================================================
  habitualScheduleDays: HabitualDay[] = [
    { key: 'lun', label: 'Lunes', startTime: '08:00', endTime: '15:00', active: true },
    { key: 'mar', label: 'Martes', startTime: '08:00', endTime: '15:00', active: true },
    { key: 'mie', label: 'Miércoles', startTime: '08:00', endTime: '15:00', active: true },
    { key: 'jue', label: 'Jueves', startTime: '08:00', endTime: '15:00', active: true },
    { key: 'vie', label: 'Viernes', startTime: '08:00', endTime: '13:00', active: true },
    { key: 'sab-dom', label: 'Sábado / Domingo', startTime: '09:00', endTime: '13:00', active: false }
  ];

  habitualDuration = '45 minutos';
  habitualBreak = '01:00 PM – 02:00 PM';

  async saveHabitualSchedule(): Promise<void> {
    await this.showToast('Horario habitual guardado correctamente', 'success');
    this.loadData();
  }

  // Filtrado
  setStatusFilter(filter: 'all' | 'Disponible' | 'Reservado' | 'Reprogramacion pendiente' | 'Cancelado' | 'Inhabilitado'): void {
    this.statusFilter = filter;
    this.cdr.detectChanges();
  }

  onFilterChange(event: any): void {
    this.statusFilter = event.detail.value || 'all';
  }

  get slotsForDay(): Availability[] {
    const dateStr = this.formatDate(this.selectedDate);
    return this.availabilities.filter(item => {
      const matchDate = item.date === dateStr;
      if (!matchDate) return false;
      if (this.statusFilter === 'all') return true;
      return item.status === this.statusFilter;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  get disabledSchedulesForDay(): DisabledSchedule[] {
    const dateStr = this.formatDate(this.selectedDate);
    return this.disabledSchedules.filter(item => {
      if (item.type === 'Puntual') {
        return item.startDate === dateStr;
      }
      return dateStr >= item.startDate && (!item.endDate || dateStr <= item.endDate);
    });
  }

  get totalDayItemsCount(): number {
    const dateStr = this.formatDate(this.selectedDate);
    const daySlots = this.availabilities.filter(i => i.date === dateStr).length;
    return daySlots + this.disabledSchedulesForDay.length;
  }

  get agendaTimelineItems(): Array<{
    key: string;
    type: 'slot' | 'disabled' | 'break';
    startTime: string;
    endTime: string;
    slot?: Availability;
    disabled?: DisabledSchedule;
  }> {
    const items: Array<{
      key: string;
      type: 'slot' | 'disabled' | 'break';
      startTime: string;
      endTime: string;
      slot?: Availability;
      disabled?: DisabledSchedule;
    }> = [];

    for (const slot of this.slotsForDay) {
      items.push({
        key: `slot-${slot.id}`,
        type: 'slot',
        startTime: slot.startTime,
        endTime: slot.endTime,
        slot
      });
    }

    if (this.statusFilter === 'all' || this.statusFilter === 'Inhabilitado') {
      for (const dis of this.disabledSchedulesForDay) {
        const alreadyCovered = items.some(
          it => it.type === 'slot' && it.slot?.status === 'Inhabilitado' && it.startTime === dis.startTime
        );
        if (!alreadyCovered) {
          items.push({
            key: `dis-${dis.id}`,
            type: 'disabled',
            startTime: dis.startTime,
            endTime: dis.endTime,
            disabled: dis
          });
        }
      }
    }

    items.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Insertar bloque de Descanso en la vista "Todos" cuando hay huecos de descanso (ej. 10:00-11:00 o 13:00-14:00)
    if (this.statusFilter === 'all' && items.length > 0) {
      let breakInserted = false;
      for (let i = 0; i < items.length - 1; i++) {
        const currentEnd = items[i].endTime.substring(0, 5);
        const nextStart = items[i + 1].startTime.substring(0, 5);
        if (currentEnd < nextStart && (currentEnd === '10:00' || currentEnd === '12:00' || currentEnd === '13:00')) {
          items.splice(i + 1, 0, {
            key: `break-${currentEnd}`,
            type: 'break',
            startTime: currentEnd,
            endTime: nextStart
          });
          breakInserted = true;
          break;
        }
      }

      if (!breakInserted) {
        const hasOnePmOverlap = items.some(
          it => it.startTime.substring(0, 5) < '14:00' && it.endTime.substring(0, 5) > '13:00'
        );
        if (!hasOnePmOverlap) {
          items.push({
            key: 'break-13:00',
            type: 'break',
            startTime: '13:00',
            endTime: '14:00'
          });
          items.sort((a, b) => a.startTime.localeCompare(b.startTime));
        }
      }
    }

    return items;
  }

  getCount(status: string): number {
    const dateStr = this.formatDate(this.selectedDate);
    return this.availabilities.filter(i => i.date === dateStr && i.status === status).length;
  }

  // Click en Slot
  onSlotClick(slot: Availability): void {
    this.selectedSlot = slot;

    if (slot.status === 'Disponible') {
      this.openBookingModal(slot);
    } else if (slot.status === 'Reservado') {
      this.activeModal = 'details';
    } else if (slot.status === 'Cancelado') {
      this.activeModal = 'cancelDetails';
    } else if (slot.status === 'Reprogramacion pendiente') {
      this.activeModal = 'rescheduleDetails';
    }
  }

  closeModal(modalName?: string): void {
    if (!modalName || this.activeModal === modalName) {
      this.activeModal = 'none';
      this.cdr.detectChanges();
    }
  }

  // 1. Inhabilitar Horario
  openDisableModal(): void {
    this.activeModal = 'disable';
    this.cdr.detectChanges();
  }

  onConflictFoundFromDisable(conflictSlot: Availability): void {
    this.selectedConflictSlot = conflictSlot;
    this.activeModal = 'disableConflict';
    this.cdr.detectChanges();
  }

  confirmDisableSchedule(payload: DisableFormPayload): void {
    this.calendarService.disableSchedule({
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      reason: payload.reason,
      observation: payload.observation
    }).subscribe({
      next: async () => {
        this.closeModal('disable');
        this.loadData();
        await this.showToast('Horario inhabilitado correctamente.', 'success');
      },
      error: async (err) => {
        await this.showToast(err.error?.error || 'Error al inhabilitar horario.', 'danger');
      }
    });
  }

  openRescheduleFromConflict(slot?: Availability): void {
    const conflictSlot = slot || this.selectedConflictSlot;
    if (conflictSlot) {
      this.closeModal('disableConflict');
      this.openRescheduleModal(conflictSlot);
    }
  }

  backToModifyDisable(): void {
    this.activeModal = 'disable';
    this.cdr.detectChanges();
  }

  // 2. Agendar Cita para Alumno (P-08 · HU-M04)
  isPastSlot(slot?: Availability | null): boolean {
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

  onAgendaAddClick(): void {
    const isFutureAvailable = (s: Availability) => {
      return s.status === 'Disponible' && !this.isPastSlot(s);
    };

    const selectedDateStr = this.formatDate(this.selectedDate);
    const freeSlot = this.availabilities.find(
      s => isFutureAvailable(s) && s.date === selectedDateStr
    ) || this.availabilities.find(isFutureAvailable) || null;

    this.openBookingModal(freeSlot);
  }

  openBookingModal(slot: Availability | null): void {
    this.selectedSlot = (slot && !this.isPastSlot(slot)) ? slot : null;
    this.activeModal = 'booking';
    this.cdr.detectChanges();
  }

  // 3. Cancelar Cita
  openCancelModal(slot?: Availability): void {
    if (slot) this.selectedSlot = slot;
    this.cancelForm.reason = 'Fuerza mayor';
    this.cancelForm.observation = '';
    this.activeModal = 'cancel';
  }

  confirmCancel(): void {
    if (!this.selectedSlot) return;
    this.calendarService.cancelAppointment(
      this.selectedSlot.id,
      this.cancelForm.reason,
      this.cancelForm.observation
    ).subscribe({
      next: async () => {
        this.closeModal();
        this.loadData();
        await this.showToast('Cita cancelada correctamente.', 'warning');
      },
      error: async (err) => {
        await this.showToast(err.error?.error || 'Error al cancelar la cita.', 'danger');
      }
    });
  }

  // 4. Reprogramar Cita
  openRescheduleModal(slot?: Availability): void {
    if (slot) this.selectedSlot = slot;
    this.rescheduleForm.newDate = this.selectedSlot?.date || this.formatDate(this.selectedDate);
    this.rescheduleForm.newSlotId = null;
    this.rescheduleForm.selectedNewSlot = null;
    this.rescheduleForm.reason = 'Ajuste de agenda psicopedagógica';
    this.activeModal = 'reschedule';
  }

  get availableSlotsForReschedule(): Availability[] {
    return this.availabilities.filter(item =>
      item.date === this.rescheduleForm.newDate &&
      item.status === 'Disponible' &&
      item.id !== this.selectedSlot?.id
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  selectRescheduleSlot(slot: Availability): void {
    this.rescheduleForm.newSlotId = slot.id;
    this.rescheduleForm.selectedNewSlot = slot;
  }

  approveReschedule(slot: Availability): void {
    this.calendarService.approveReschedule(slot.id).subscribe({
      next: async () => {
        this.closeModal();
        this.loadData();
        this.approvedRescheduleSlot = slot;
        this.activeModal = 'rescheduleSuccess';
        this.cdr.detectChanges();
      },
      error: async (err) => {
        await this.showToast(err.error?.error || 'Error al aprobar la reprogramación.', 'danger');
      }
    });
  }

  goToAgendaFromSuccess(): void {
    this.closeModal('rescheduleSuccess');
    this.setTab('agenda');
  }

  rejectReschedule(slot: Availability): void {
    const isAlumno = slot.rescheduleRequestedBy === 'alumno';
    const confirmMsg = isAlumno
      ? '¿Rechazar la solicitud de cambio del alumno? La cita se mantendrá en su horario original.'
      : '¿Deseas cancelar la propuesta de reprogramación?';

    if (!confirm(confirmMsg)) return;

    this.calendarService.rejectReschedule(slot.id).subscribe({
      next: async (res) => {
        this.closeModal();
        this.loadData();
        if (res.action === 'cancelled') {
          await this.showToast('Propuesta cancelada. La cita ha sido cancelada.', 'warning');
        } else {
          await this.showToast('Solicitud rechazada. La cita se mantiene en su horario original.', 'success');
        }
      },
      error: async (err) => {
        await this.showToast(err.error?.error || 'Error al rechazar la reprogramación.', 'danger');
      }
    });
  }

  saveReschedule(): void {
    if (!this.selectedSlot || !this.rescheduleForm.selectedNewSlot) {
      this.showToast('Por favor selecciona el nuevo horario propuesto.', 'warning');
      return;
    }

    this.calendarService.rescheduleAppointment(
      this.selectedSlot.id,
      this.rescheduleForm.newDate,
      this.rescheduleForm.selectedNewSlot.startTime,
      this.rescheduleForm.selectedNewSlot.endTime,
      this.rescheduleForm.reason
    ).subscribe({
      next: async () => {
        this.closeModal();
        this.loadData();
        await this.showToast('Propuesta de reprogramación enviada correctamente.', 'warning');
      },
      error: async (err) => {
        await this.showToast(err.error?.error || 'Error al proponer la reprogramación.', 'danger');
      }
    });
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}

