import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular, ToastController } from '@ionic/angular';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlumnoPage } from './alumno.page';
import { CalendarService } from '../../core/services/calendar.service';
import { AuthService } from '../../core/services/auth.service';
import { Availability, Appointment } from '../../core/models/availability.model';

describe('AlumnoPage', () => {
  let component: AlumnoPage;
  let fixture: ComponentFixture<AlumnoPage>;
  let calendarServiceMock: any;
  let authServiceMock: any;

  const mockSlot: Availability = {
    id: 55,
    date: '2026-11-25',
    startTime: '10:00:00',
    endTime: '10:45:00',
    duration: 45,
    breakTime: 15,
    status: 'Disponible'
  };

  const mockAppointment: Appointment = {
    id: 10,
    student_id: 1,
    student_name: 'Carlos Alumno',
    date: '2026-11-25',
    start_time: '10:00:00',
    end_time: '10:45:00',
    duration: 45,
    modality: 'Presencial',
    location: 'Cubículo 2B',
    meeting_url: null,
    reason: 'Consulta de orientación',
    status: 'Reserved',
    created_at: '2026-11-24T10:00:00'
  };

  beforeEach(async () => {
    calendarServiceMock = {
      getAvailabilities: vi.fn().mockReturnValue(of([mockSlot])),
      getDisabledSchedules: vi.fn().mockReturnValue(of([])),
      getStudentMyAppointments: vi.fn().mockReturnValue(of({ appointments: [mockAppointment] })),
      cancelStudentAppointment: vi.fn().mockReturnValue(of({ message: 'Cancelled' })),
      requestStudentReschedule: vi.fn().mockReturnValue(of({ message: 'Reschedule requested' })),
      approveStudentReschedule: vi.fn().mockReturnValue(of({ message: 'Approved' })),
      rejectStudentReschedule: vi.fn().mockReturnValue(of({ message: 'Rejected' })),
      scheduleChanged$: of()
    };

    authServiceMock = {
      currentUser: vi.fn().mockReturnValue({
        id: 1,
        name: 'Carlos Alumno',
        email: 'carlos@ejemplo.com',
        role: 'alumno'
      }),
      refreshPipgStatus: vi.fn().mockReturnValue(of({ status: 'completed', completed: true })),
      isPipgPending: vi.fn().mockReturnValue(false),
      pipgState: vi.fn().mockReturnValue({ status: 'completed', completed: true }),
      logout: vi.fn().mockReturnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [AlumnoPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: CalendarService, useValue: calendarServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastController, useValue: { create: vi.fn().mockResolvedValue({ present: vi.fn() }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AlumnoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the AlumnoPage component', () => {
    expect(component).toBeTruthy();
  });

  it('should load availabilities and student appointments on initialization', () => {
    expect(calendarServiceMock.getAvailabilities).toHaveBeenCalled();
    expect(calendarServiceMock.getStudentMyAppointments).toHaveBeenCalled();
    expect(component.availabilities.length).toBe(1);
    expect(component.studentAppointments.length).toBe(1);
    expect(component.studentAppointments[0].id).toBe(10);
  });

  it('should switch calendarViewMode between dia, semana, and mes', () => {
    expect(component.calendarViewMode).toBe('dia');

    component.onViewModeChange('semana');
    expect(component.calendarViewMode).toBe('semana');

    component.onViewModeChange('mes');
    expect(component.calendarViewMode).toBe('mes');

    component.onViewModeChange('dia');
    expect(component.calendarViewMode).toBe('dia');
  });

  it('should open booking modal when an available slot is selected', () => {
    expect(component.isBookingModalOpen).toBe(false);
    expect(component.selectedSlotForBooking).toBeNull();

    component.onSlotSelect(mockSlot);

    expect(component.isBookingModalOpen).toBe(true);
    expect(component.selectedSlotForBooking).toBe(mockSlot);
    expect(component.selectedSlotId).toBe(55);
  });

  it('should NOT open booking modal if P-IPG is pending', async () => {
    const authService = TestBed.inject(AuthService);
    vi.spyOn(authService, 'isPipgPending').mockReturnValue(true);
    const toastSpy = vi.spyOn(component, 'showPipgRequiredToast');

    await component.onSlotSelect(mockSlot);

    expect(component.isBookingModalOpen).toBe(false);
    expect(component.selectedSlotForBooking).toBeNull();
    expect(toastSpy).toHaveBeenCalled();
  });

  it('should not open booking modal if slot is not Disponible', () => {
    const occupiedSlot: Availability = { ...mockSlot, id: 99, status: 'Reservado' };
    component.onSlotSelect(occupiedSlot);

    expect(component.isBookingModalOpen).toBe(false);
    expect(component.selectedSlotForBooking).toBeNull();
  });

  it('should close booking modal and clear selection', () => {
    component.onSlotSelect(mockSlot);
    expect(component.isBookingModalOpen).toBe(true);

    component.closeBookingModal();
    expect(component.isBookingModalOpen).toBe(false);
    expect(component.selectedSlotForBooking).toBeNull();
  });

  it('should reload availabilities and student appointments after an appointment is booked', () => {
    const loadDataSpy = vi.spyOn(component, 'loadData');
    const loadAptSpy = vi.spyOn(component, 'loadStudentAppointments');
    component.onSlotSelect(mockSlot);

    component.onAppointmentBooked();

    expect(component.isBookingModalOpen).toBe(false);
    expect(loadDataSpy).toHaveBeenCalled();
    expect(loadAptSpy).toHaveBeenCalledWith(false);
  });

  it('should handle error when loading student appointments', () => {
    calendarServiceMock.getStudentMyAppointments.mockReturnValue(
      throwError(() => ({ error: { error: 'Error del servidor' } }))
    );

    component.loadStudentAppointments();

    expect(component.isLoadingAppointments).toBe(false);
    expect(component.appointmentsError).toBe('Error del servidor');
  });

  it('should handle month navigation correctly', () => {
    component.selectedDate = new Date(2026, 10, 15); // Nov 2026

    component.onMonthChange(1); // Dec 2026
    expect(component.selectedDate.getMonth()).toBe(11);

    component.onMonthChange(-1); // Nov 2026
    expect(component.selectedDate.getMonth()).toBe(10);
  });

  it('should reset date to today when onTodayClick is called', () => {
    component.selectedDate = new Date(2020, 0, 1);
    component.onTodayClick();

    const today = new Date();
    expect(component.selectedDate.getDate()).toBe(today.getDate());
    expect(component.selectedDate.getMonth()).toBe(today.getMonth());
    expect(component.selectedDate.getFullYear()).toBe(today.getFullYear());
  });

  it('should switch bottom navigation tabs and refresh appointments on inicio/mis-citas', () => {
    const loadAptSpy = vi.spyOn(component, 'loadStudentAppointments');

    component.onTabChange('inicio');
    expect(component.activeTab).toBe('inicio');
    expect(loadAptSpy).toHaveBeenCalledWith(false);

    component.onTabChange('mis-citas');
    expect(component.activeTab).toBe('mis-citas');
    expect(loadAptSpy).toHaveBeenCalledWith(false);

    component.onTabChange('perfil');
    expect(component.activeTab).toBe('perfil');
  });

  it('should navigate to /pipg-test when onStartPipg is called', () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onStartPipg();
    expect(navSpy).toHaveBeenCalledWith(['/pipg-test']);
  });

  it('should set activeTab to inicio if PIPG is pending upon init', () => {
    authServiceMock.refreshPipgStatus.mockReturnValue(of({ status: 'not_started', completed: false }));
    authServiceMock.isPipgPending.mockReturnValue(true);

    component.ngOnInit();
    expect(component.activeTab).toBe('inicio');
    expect(component.isPipgPending).toBe(true);
  });

  it('should open and close cancel modal and reload appointments on cancellation', () => {
    const loadAptSpy = vi.spyOn(component, 'loadStudentAppointments');
    const loadDataSpy = vi.spyOn(component, 'loadData');

    expect(component.isCancelModalOpen).toBe(false);
    expect(component.selectedAppointmentForCancel).toBeNull();

    component.openCancelModal(mockAppointment);
    expect(component.isCancelModalOpen).toBe(true);
    expect(component.selectedAppointmentForCancel).toBe(mockAppointment);

    component.onAppointmentCancelled();
    expect(component.isCancelModalOpen).toBe(false);
    expect(component.selectedAppointmentForCancel).toBeNull();
    expect(loadAptSpy).toHaveBeenCalledWith(false);
    expect(loadDataSpy).toHaveBeenCalled();
  });

  it('should open and close reschedule modal and reload appointments on reschedule requested', () => {
    const loadAptSpy = vi.spyOn(component, 'loadStudentAppointments');
    const loadDataSpy = vi.spyOn(component, 'loadData');

    expect(component.isRescheduleModalOpen).toBe(false);
    expect(component.selectedAppointmentForReschedule).toBeNull();

    component.openRescheduleModal(mockAppointment);
    expect(component.isRescheduleModalOpen).toBe(true);
    expect(component.selectedAppointmentForReschedule).toBe(mockAppointment);

    component.onRescheduleRequested();
    expect(component.isRescheduleModalOpen).toBe(false);
    expect(component.selectedAppointmentForReschedule).toBeNull();
    expect(loadAptSpy).toHaveBeenCalledWith(false);
    expect(loadDataSpy).toHaveBeenCalled();
  });

  it('should call approveStudentReschedule and reload data on onAcceptReschedule', () => {
    const loadAptSpy = vi.spyOn(component, 'loadStudentAppointments');
    const loadDataSpy = vi.spyOn(component, 'loadData');

    component.onAcceptReschedule(mockAppointment);

    expect(calendarServiceMock.approveStudentReschedule).toHaveBeenCalledWith(mockAppointment.id);
    expect(loadAptSpy).toHaveBeenCalledWith(false);
    expect(loadDataSpy).toHaveBeenCalled();
  });

  it('should call rejectStudentReschedule and reload data on onRejectReschedule', () => {
    const loadAptSpy = vi.spyOn(component, 'loadStudentAppointments');
    const loadDataSpy = vi.spyOn(component, 'loadData');

    const studentReqApt: Appointment = {
      ...mockAppointment,
      reschedule_requested_by: 'alumno'
    };

    component.onRejectReschedule(studentReqApt);

    expect(calendarServiceMock.rejectStudentReschedule).toHaveBeenCalledWith(studentReqApt.id);
    expect(loadAptSpy).toHaveBeenCalledWith(false);
    expect(loadDataSpy).toHaveBeenCalled();
  });
});
