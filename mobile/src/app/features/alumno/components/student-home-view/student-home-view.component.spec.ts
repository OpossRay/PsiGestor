import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StudentHomeViewComponent } from './student-home-view.component';
import { Appointment } from '../../../../core/models/availability.model';

describe('StudentHomeViewComponent', () => {
  let component: StudentHomeViewComponent;
  let fixture: ComponentFixture<StudentHomeViewComponent>;

  const mockActiveAppointment: Appointment = {
    id: 1,
    student_id: 10,
    student_name: 'Carlos Alumno',
    date: '2026-11-25',
    start_time: '10:00:00',
    end_time: '10:45:00',
    duration: 45,
    modality: 'Presencial',
    location: 'Cubículo 2B - Departamento de Orientación y Psicología',
    meeting_url: null,
    reason: 'Asesoría para manejo del estrés y técnicas de estudio',
    status: 'Reserved',
    created_at: '2026-11-24T10:00:00'
  };

  const mockPendingRescheduleAppointment: Appointment = {
    id: 2,
    student_id: 10,
    student_name: 'Carlos Alumno',
    date: '2026-11-28',
    start_time: '12:00:00',
    end_time: '12:45:00',
    duration: 45,
    modality: 'En línea',
    location: null,
    meeting_url: 'https://meet.google.com/abc-defg-hij',
    reason: 'Cambio de horario por traslape con examen',
    status: 'Pending Reschedule',
    created_at: '2026-11-24T11:00:00'
  };

  const mockCancelledAppointment: Appointment = {
    id: 3,
    student_id: 10,
    student_name: 'Carlos Alumno',
    date: '2026-11-10',
    start_time: '09:00:00',
    end_time: '09:45:00',
    duration: 45,
    modality: 'Presencial',
    location: 'Cubículo 2B',
    meeting_url: null,
    reason: 'Sesión inicial',
    status: 'Cancelled',
    created_at: '2026-11-01T10:00:00'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentHomeViewComponent],
      providers: [provideIonicAngular()]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentHomeViewComponent);
    component = fixture.componentInstance;
    component.studentName = 'Carlos Alumno';
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should show loading state when isLoading is true', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.loading-card')).toBeTruthy();
    expect(compiled.textContent).toContain('Cargando información de tus citas');
  });

  it('should show error state and emit retryLoad when retry button is clicked', () => {
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('errorMessage', 'No hay conexión con el servidor.');
    fixture.detectChanges();

    const retrySpy = vi.spyOn(component.retryLoad, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.error-card')).toBeTruthy();
    expect(compiled.textContent).toContain('No hay conexión con el servidor.');

    const retryBtn = compiled.querySelector('.btn-retry') as HTMLButtonElement;
    expect(retryBtn).toBeTruthy();
    retryBtn.click();
    expect(retrySpy).toHaveBeenCalled();
  });

  it('should show empty state when there are no appointments and emit bookAppointment on CTA click', () => {
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('errorMessage', null);
    fixture.componentRef.setInput('appointments', []);
    fixture.detectChanges();

    const bookSpy = vi.spyOn(component.bookAppointment, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.empty-card')).toBeTruthy();
    expect(compiled.textContent).toContain('Sin citas programadas');

    const ctaBtn = compiled.querySelector('.btn-primary-cta') as HTMLButtonElement;
    expect(ctaBtn).toBeTruthy();
    ctaBtn.click();
    expect(bookSpy).toHaveBeenCalled();
  });

  it('should display active appointments with correct details and formatting', () => {
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('errorMessage', null);
    fixture.componentRef.setInput('appointments', [mockActiveAppointment, mockPendingRescheduleAppointment]);
    fixture.detectChanges();

    expect(component.activeAppointments.length).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.appointment-card');
    expect(cards.length).toBe(2);

    // Formatted details
    expect(compiled.textContent).toContain('Confirmada');
    expect(compiled.textContent).toContain('Reprogramación pendiente');
    expect(compiled.textContent).toContain('Asesoría para manejo del estrés');
    expect(compiled.textContent).toContain('10:00 AM – 10:45 AM');
  });

  it('should format modality and status badges appropriately', () => {
    const badgeReserved = component.getStatusBadge('Reserved');
    expect(badgeReserved.label).toBe('Confirmada');
    expect(badgeReserved.cssClass).toBe('badge-confirmed');

    const badgePending = component.getStatusBadge('Pending Reschedule');
    expect(badgePending.label).toBe('Reprogramación pendiente');
    expect(badgePending.cssClass).toBe('badge-pending');

    const badgeCancelled = component.getStatusBadge('Cancelled');
    expect(badgeCancelled.label).toBe('Cancelada');
    expect(badgeCancelled.cssClass).toBe('badge-cancelled');

    const modOnline = component.getModalityDisplay('Online');
    expect(modOnline.label).toContain('Google Meet');

    const modPresencial = component.getModalityDisplay('Presencial');
    expect(modPresencial.label).toContain('Cubículo 2B');
  });

  it('should separate past or cancelled appointments into history', () => {
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('errorMessage', null);
    fixture.componentRef.setInput('appointments', [mockActiveAppointment, mockCancelledAppointment]);
    fixture.detectChanges();

    expect(component.activeAppointments.length).toBe(1);
    expect(component.pastAppointments.length).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.history-section')).toBeTruthy();
    expect(compiled.textContent).toContain('Historial de Citas');
  });

  it('should display PIPG invitation banner when pipgPending is true and not full history', () => {
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('isFullHistory', false);
    fixture.componentRef.setInput('pipgPending', true);
    fixture.componentRef.setInput('pipgStatus', 'not_started');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const banner = compiled.querySelector('.pipg-invitation-card');
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain('Cuestionario P-IPG (Gordon)');
    expect(banner?.textContent).toContain('Realizar evaluación');

    const startSpy = vi.spyOn(component.startPipg, 'emit');
    const startBtn = banner?.querySelector('.btn-pipg-start') as HTMLButtonElement;
    startBtn.click();
    expect(startSpy).toHaveBeenCalled();
  });

  it('should hide PIPG invitation banner when pipgPending is false', () => {
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('isFullHistory', false);
    fixture.componentRef.setInput('pipgPending', false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const banner = compiled.querySelector('.pipg-invitation-card');
    expect(banner).toBeFalsy();
  });

  it('should emit rescheduleAppointment and cancelAppointment when action buttons are clicked', () => {
    // Mock future appointment
    const futureApt: Appointment = {
      ...mockActiveAppointment,
      date: '2099-12-31',
      start_time: '10:00:00',
      end_time: '10:45:00',
    };

    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('isFullHistory', false);
    fixture.componentRef.setInput('appointments', [futureApt]);
    fixture.detectChanges();

    const rescheduleSpy = vi.spyOn(component.rescheduleAppointment, 'emit');
    const cancelSpy = vi.spyOn(component.cancelAppointment, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;

    const rescheduleBtn = compiled.querySelector('.btn-action-reschedule') as HTMLButtonElement;
    const cancelBtn = compiled.querySelector('.btn-action-cancel') as HTMLButtonElement;

    expect(rescheduleBtn).toBeTruthy();
    expect(cancelBtn).toBeTruthy();

    rescheduleBtn.click();
    expect(rescheduleSpy).toHaveBeenCalledWith(futureApt);

    cancelBtn.click();
    expect(cancelSpy).toHaveBeenCalledWith(futureApt);
  });

  it('should filter appointments correctly in isFullHistory view', () => {
    const futureApt: Appointment = {
      ...mockActiveAppointment,
      date: '2099-12-31',
      status: 'Reserved',
    };
    const reqApt: Appointment = {
      ...mockPendingRescheduleAppointment,
      date: '2099-12-30',
      status: 'Pending Reschedule',
      reschedule_requested_by: 'psicologo',
      proposed_date: '2099-12-31',
      proposed_start_time: '11:00:00',
      proposed_end_time: '11:45:00',
    };
    const pastApt: Appointment = {
      ...mockActiveAppointment,
      id: 99,
      date: '2020-01-01',
      status: 'Reserved',
    };
    const cancelApt: Appointment = {
      ...mockCancelledAppointment,
      cancellation_reason: 'Motivo de prueba',
    };

    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('isFullHistory', true);
    fixture.componentRef.setInput('appointments', [futureApt, reqApt, pastApt, cancelApt]);
    fixture.detectChanges();

    // Default 'all'
    expect(component.activeFilter).toBe('all');
    expect(component.filteredAppointments.length).toBe(4);

    // Filter 'upcoming'
    component.setFilter('upcoming');
    expect(component.filteredAppointments.length).toBe(1);

    // Filter 'requests'
    component.setFilter('requests');
    expect(component.filteredAppointments.length).toBe(1);

    // Filter 'history'
    component.setFilter('history');
    expect(component.filteredAppointments.length).toBe(1);

    // Filter 'cancelled'
    component.setFilter('cancelled');
    expect(component.filteredAppointments.length).toBe(1);
  });

  it('should emit acceptReschedule and rejectReschedule when psychologist proposes a new slot', () => {
    const reqApt: Appointment = {
      ...mockPendingRescheduleAppointment,
      date: '2099-12-30',
      status: 'Pending Reschedule',
      reschedule_requested_by: 'psicologo',
      proposed_date: '2099-12-31',
      proposed_start_time: '11:00:00',
      proposed_end_time: '11:45:00',
      reschedule_reason: 'Reunión de coordinación',
    };

    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('isFullHistory', false);
    fixture.componentRef.setInput('appointments', [reqApt]);
    fixture.detectChanges();

    const acceptSpy = vi.spyOn(component.acceptReschedule, 'emit');
    const rejectSpy = vi.spyOn(component.rejectReschedule, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Propuesta de la psicóloga:');
    expect(compiled.textContent).toContain('Reunión de coordinación');

    const acceptBtn = compiled.querySelector('.btn-proposal-accept') as HTMLButtonElement;
    const rejectBtn = compiled.querySelector('.btn-proposal-reject') as HTMLButtonElement;

    expect(acceptBtn).toBeTruthy();
    expect(rejectBtn).toBeTruthy();

    acceptBtn.click();
    expect(acceptSpy).toHaveBeenCalledWith(reqApt);

    rejectBtn.click();
    expect(rejectSpy).toHaveBeenCalledWith(reqApt);
  });

  it('should emit rejectReschedule to discard student own reschedule request', () => {
    const reqApt: Appointment = {
      ...mockPendingRescheduleAppointment,
      date: '2099-12-30',
      status: 'Pending Reschedule',
      reschedule_requested_by: 'alumno',
      proposed_date: '2099-12-31',
      proposed_start_time: '11:00:00',
      proposed_end_time: '11:45:00',
      reschedule_reason: 'Traslape de clases',
    };

    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('isFullHistory', false);
    fixture.componentRef.setInput('appointments', [reqApt]);
    fixture.detectChanges();

    const discardSpy = vi.spyOn(component.rejectReschedule, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Tu solicitud de reprogramación:');

    const discardBtn = compiled.querySelector('.btn-proposal-discard') as HTMLButtonElement;
    expect(discardBtn).toBeTruthy();

    discardBtn.click();
    expect(discardSpy).toHaveBeenCalledWith(reqApt);
  });
});
