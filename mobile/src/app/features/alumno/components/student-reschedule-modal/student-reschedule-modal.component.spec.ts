import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { StudentRescheduleModalComponent } from './student-reschedule-modal.component';
import { CalendarService } from '../../../../core/services/calendar.service';
import { Appointment, Availability } from '../../../../core/models/availability.model';

describe('StudentRescheduleModalComponent', () => {
  let component: StudentRescheduleModalComponent;
  let fixture: ComponentFixture<StudentRescheduleModalComponent>;
  let calendarServiceMock: any;

  const mockApt: Appointment = {
    id: 50,
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

  const mockSlots: Availability[] = [
    {
      id: 101,
      date: '2026-11-29',
      startTime: '10:00:00',
      endTime: '10:45:00',
      duration: 45,
      breakTime: 15,
      status: 'Disponible',
    },
    {
      id: 102,
      date: '2026-11-30',
      startTime: '12:00:00',
      endTime: '12:45:00',
      duration: 45,
      breakTime: 15,
      status: 'Disponible',
    },
  ];

  beforeEach(async () => {
    calendarServiceMock = {
      getAvailabilities: vi.fn().mockReturnValue(of(mockSlots)),
      requestStudentReschedule: vi.fn().mockReturnValue(of({ message: 'Solicitud enviada' })),
    };

    await TestBed.configureTestingModule({
      imports: [StudentRescheduleModalComponent],
      providers: [
        provideIonicAngular(),
        { provide: CalendarService, useValue: calendarServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentRescheduleModalComponent);
    component = fixture.componentInstance;
    component.appointment = mockApt;
    component.isOpen = true;
  });

  it('should create the component and load available slots', () => {
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    expect(component).toBeTruthy();
    expect(calendarServiceMock.getAvailabilities).toHaveBeenCalled();
    expect(component.availableSlots.length).toBe(2);
  });

  it('should validate missing slot selection', () => {
    component.selectedSlotId = null;
    component.reason = 'Cambio de horario por traslape';
    component.submitReschedule();

    expect(component.errorMessage).toContain('seleccionar un nuevo horario');
    expect(calendarServiceMock.requestStudentReschedule).not.toHaveBeenCalled();
  });

  it('should validate empty reason', () => {
    component.selectedSlotId = 101;
    component.reason = '   ';
    component.submitReschedule();

    expect(component.errorMessage).toContain('motivo de la reprogramación es obligatorio');
    expect(calendarServiceMock.requestStudentReschedule).not.toHaveBeenCalled();
  });

  it('should submit reschedule request successfully', () => {
    const emitSpy = vi.spyOn(component.rescheduleRequested, 'emit');
    component.selectedSlotId = 101;
    component.reason = 'Tengo una clase programada en ese horario';

    component.submitReschedule();

    expect(calendarServiceMock.requestStudentReschedule).toHaveBeenCalledWith(
      50,
      101,
      'Tengo una clase programada en ese horario'
    );
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should handle service error gracefully', () => {
    calendarServiceMock.requestStudentReschedule.mockReturnValue(
      throwError(() => ({ error: { error: 'El horario propuesto ya no está disponible.' } }))
    );

    component.selectedSlotId = 101;
    component.reason = 'Tengo una clase programada en ese horario';
    component.submitReschedule();

    expect(component.errorMessage).toBe('El horario propuesto ya no está disponible.');
  });
});
