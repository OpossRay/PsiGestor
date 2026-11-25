import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StudentBookingModalComponent } from './student-booking-modal.component';
import { CalendarService } from '../../../../core/services/calendar.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Availability } from '../../../../core/models/availability.model';

describe('StudentBookingModalComponent', () => {
  let component: StudentBookingModalComponent;
  let fixture: ComponentFixture<StudentBookingModalComponent>;
  let calendarServiceMock: any;
  let authServiceMock: any;
  let toastCtrlMock: any;

  const mockSlot: Availability = {
    id: 101,
    date: '2026-11-25',
    startTime: '10:00:00',
    endTime: '10:45:00',
    duration: 45,
    breakTime: 15,
    status: 'Disponible'
  };

  beforeEach(async () => {
    calendarServiceMock = {
      bookStudentAppointment: vi.fn().mockReturnValue(of({ message: 'Cita confirmada' }))
    };

    authServiceMock = {
      currentUser: vi.fn().mockReturnValue({
        id: 12,
        name: 'Carlos Alumno',
        email: 'carlos.alumno@ejemplo.com',
        role: 'alumno',
        studentId: 44
      })
    };

    toastCtrlMock = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined)
      })
    };

    await TestBed.configureTestingModule({
      imports: [StudentBookingModalComponent],
      providers: [
        provideIonicAngular(),
        { provide: CalendarService, useValue: calendarServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastController, useValue: toastCtrlMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentBookingModalComponent);
    component = fixture.componentInstance;
    component.slot = mockSlot;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should format date and time range properly in 12h format', () => {
    expect(component.formattedDate).toContain('25 de Noviembre');
    expect(component.formattedTimeRange).toContain('10:00 AM');
    expect(component.formattedTimeRange).toContain('10:45 AM');
  });

  it('should switch modality between Presencial and En línea', () => {
    expect(component.modality).toBe('Presencial');
    expect(component.location).toContain('Cubículo 2B');

    component.setModality('En línea');
    expect(component.modality).toBe('En línea');
    expect(component.location).toContain('Google Meet');

    component.setModality('Presencial');
    expect(component.modality).toBe('Presencial');
  });

  it('should validate consultation reason before submitting', () => {
    component.reason = '    ';
    component.confirmBooking();

    expect(component.errorMessage).toContain('motivo de la consulta es obligatorio');
    expect(calendarServiceMock.bookStudentAppointment).not.toHaveBeenCalled();

    component.reason = 'Hola'; // Less than 5 chars
    component.confirmBooking();
    expect(component.errorMessage).toContain('mínimo 5 caracteres');
    expect(calendarServiceMock.bookStudentAppointment).not.toHaveBeenCalled();
  });

  it('should call calendarService.bookStudentAppointment and emit events on success', () => {
    const bookedSpy = vi.spyOn(component.appointmentBooked, 'emit');
    const closeSpy = vi.spyOn(component.closeModal, 'emit');

    component.reason = 'Orientación sobre técnicas de estudio para parciales';
    component.confirmBooking();

    expect(calendarServiceMock.bookStudentAppointment).toHaveBeenCalledWith({
      date: '2026-11-25',
      start_time: '10:00:00',
      end_time: '10:45:00',
      duration: 45,
      modality: 'Presencial',
      location: 'Cubículo 2B - Departamento de Orientación y Psicología',
      meeting_url: undefined,
      reason: 'Orientación sobre técnicas de estudio para parciales'
    });

    expect(bookedSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should handle backend error gracefully', () => {
    calendarServiceMock.bookStudentAppointment.mockReturnValue(
      throwError(() => ({ error: { error: 'El horario seleccionado ya fue reservado.' } }))
    );

    component.reason = 'Consulta de seguimiento académico';
    component.confirmBooking();

    expect(component.isSubmitting).toBe(false);
    expect(component.errorMessage).toBe('El horario seleccionado ya fue reservado.');
    expect(toastCtrlMock.create).toHaveBeenCalled();
  });
});
