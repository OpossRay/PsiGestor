import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { StudentCancelModalComponent } from './student-cancel-modal.component';
import { CalendarService } from '../../../../core/services/calendar.service';
import { Appointment } from '../../../../core/models/availability.model';

describe('StudentCancelModalComponent', () => {
  let component: StudentCancelModalComponent;
  let fixture: ComponentFixture<StudentCancelModalComponent>;
  let calendarServiceMock: any;

  const mockApt: Appointment = {
    id: 99,
    student_id: 10,
    student_name: 'Estudiante Prueba',
    date: '2026-11-28',
    start_time: '11:00:00',
    end_time: '11:45:00',
    duration: 45,
    modality: 'Presencial',
    location: 'Cubículo 2B',
    meeting_url: null,
    reason: 'Orientación académica',
    status: 'Reserved',
    created_at: '2026-11-24T10:00:00',
  };

  beforeEach(async () => {
    calendarServiceMock = {
      cancelStudentAppointment: vi.fn().mockReturnValue(of({ message: 'Cancelada' })),
    };

    await TestBed.configureTestingModule({
      imports: [StudentCancelModalComponent],
      providers: [
        provideIonicAngular(),
        { provide: CalendarService, useValue: calendarServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentCancelModalComponent);
    component = fixture.componentInstance;
    component.appointment = mockApt;
    component.isOpen = true;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should validate empty reason', () => {
    component.reason = '   ';
    component.isConfirmed = true;
    component.submitCancellation();

    expect(component.errorMessage).toContain('motivo de cancelación es obligatorio');
    expect(calendarServiceMock.cancelStudentAppointment).not.toHaveBeenCalled();
  });

  it('should validate reason length < 5 characters', () => {
    component.reason = 'hola';
    component.isConfirmed = true;
    component.submitCancellation();

    expect(component.errorMessage).toContain('mínimo 5 caracteres');
    expect(calendarServiceMock.cancelStudentAppointment).not.toHaveBeenCalled();
  });

  it('should validate confirmation checkbox', () => {
    component.reason = 'No podré asistir por examen';
    component.isConfirmed = false;
    component.submitCancellation();

    expect(component.errorMessage).toContain('marcar la casilla');
    expect(calendarServiceMock.cancelStudentAppointment).not.toHaveBeenCalled();
  });

  it('should cancel appointment successfully when valid', () => {
    const cancelSpy = vi.spyOn(component.appointmentCancelled, 'emit');
    component.reason = 'Tengo examen a esa misma hora';
    component.isConfirmed = true;

    component.submitCancellation();

    expect(calendarServiceMock.cancelStudentAppointment).toHaveBeenCalledWith(99, 'Tengo examen a esa misma hora');
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('should handle cancel error from service', () => {
    calendarServiceMock.cancelStudentAppointment.mockReturnValue(
      throwError(() => ({ error: { error: 'La cita ya se encuentra cancelada.' } }))
    );

    component.reason = 'No podré asistir por examen';
    component.isConfirmed = true;
    component.submitCancellation();

    expect(component.errorMessage).toBe('La cita ya se encuentra cancelada.');
  });
});
