import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular, ToastController } from '@ionic/angular';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PsicologoPage } from './psicologo.page';
import { CalendarService } from '../../core/services/calendar.service';
import { AuthService } from '../../core/services/auth.service';
import { PipgService } from '../../core/services/pipg.service';
import { PipgAssessment } from '../../core/models/pipg.model';

describe('PsicologoPage', () => {
  let component: PsicologoPage;
  let fixture: ComponentFixture<PsicologoPage>;
  let calendarServiceMock: any;
  let authServiceMock: any;
  let pipgServiceMock: any;

  const mockAssessment: PipgAssessment = {
    id: 1,
    studentId: 10,
    studentName: 'Ana Morales López',
    studentCode: '20240981',
    program: 'Ingeniería en Computación',
    semester: 3,
    status: 'completed',
    answers: { selectedCells: [] },
    directScores: { A: 25, R: 24, E: 28, S: 22, AE: 99, C: 30, O: 27, P: 25, V: 26 },
    percentileScores: { A: 73, R: 48, E: 78, S: 47, C: 79, O: 68, P: 53, V: 59 },
    startedAt: '2026-11-20T10:00:00Z',
    completedAt: '2026-11-20T10:35:00Z',
  };

  beforeEach(async () => {
    calendarServiceMock = {
      getAvailabilities: vi.fn().mockReturnValue(of([])),
      getDisabledSchedules: vi.fn().mockReturnValue(of([])),
      getHabitualSchedule: vi.fn().mockReturnValue(of(null)),
      scheduleChanged$: of(),
    };

    authServiceMock = {
      currentUser: vi.fn().mockReturnValue({
        id: 2,
        name: 'Lic. Mariana Rojas V.',
        email: 'mariana.rojas@uabc.edu.mx',
        role: 'psicologo',
      }),
      logout: vi.fn().mockReturnValue(of({})),
    };

    pipgServiceMock = {
      getResults: vi.fn().mockReturnValue(of({ assessments: [mockAssessment] })),
    };

    await TestBed.configureTestingModule({
      imports: [PsicologoPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: CalendarService, useValue: calendarServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: PipgService, useValue: pipgServiceMock },
        {
          provide: ToastController,
          useValue: { create: vi.fn().mockResolvedValue({ present: vi.fn() }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PsicologoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the PsicologoPage component', () => {
    expect(component).toBeTruthy();
  });

  it('should switch to evaluaciones tab and load completed assessments', () => {
    expect(component.activeTab).toBe('agenda');

    component.setTab('evaluaciones');

    expect(component.activeTab).toBe('evaluaciones');
    expect(pipgServiceMock.getResults).toHaveBeenCalled();
    expect(component.completedAssessments.length).toBe(1);
    expect(component.completedAssessments[0].studentName).toBe('Ana Morales López');
  });

  it('should handle error when loading assessments fails', () => {
    pipgServiceMock.getResults.mockReturnValue(
      throwError(() => ({ error: { error: 'Error al consultar resultados P-IPG' } }))
    );

    component.loadCompletedAssessments();

    expect(component.isLoadingAssessments).toBe(false);
    expect(component.assessmentsError).toBe('Error al consultar resultados P-IPG');
  });

  it('should open and close assessment detail modal', () => {
    expect(component.isAssessmentDetailOpen).toBe(false);
    expect(component.selectedAssessmentForDetail).toBeNull();

    component.openAssessmentDetail(mockAssessment);

    expect(component.isAssessmentDetailOpen).toBe(true);
    expect(component.selectedAssessmentForDetail).toBe(mockAssessment);

    component.closeAssessmentDetail();

    expect(component.isAssessmentDetailOpen).toBe(false);
    expect(component.selectedAssessmentForDetail).toBeNull();
  });

  it('should switch to evaluaciones tab from bottom nav', () => {
    const setTabSpy = vi.spyOn(component, 'setTab');

    component.onBottomNavTabChange('evaluaciones');

    expect(setTabSpy).toHaveBeenCalledWith('evaluaciones');
    expect(component.activeTab).toBe('evaluaciones');
  });

  it('should switch to evaluaciones tab from quick module click', () => {
    const setTabSpy = vi.spyOn(component, 'setTab');

    component.onQuickModuleClick('evaluaciones');

    expect(setTabSpy).toHaveBeenCalledWith('evaluaciones');
    expect(component.activeTab).toBe('evaluaciones');
  });
});
