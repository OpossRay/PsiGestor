import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { PipgTestPage } from './pipg-test.page';
import { PipgService } from '../../../../../core/services/pipg.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { PIPG_QUESTION_GROUPS } from '../../data/pipg-question-groups.data';

describe('PipgTestPage', () => {
  let component: PipgTestPage;
  let fixture: ComponentFixture<PipgTestPage>;
  let mockPipgService: any;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockPipgService = {
      getAssessment: vi.fn().mockReturnValue(
        of({
          assessment: {
            id: 1,
            studentId: 10,
            status: 'in_progress',
            answers: { selectedCells: [] },
            directScores: null,
            percentileScores: null,
            startedAt: '2026-11-24T10:00:00Z',
            completedAt: null,
          },
        })
      ),
      saveAnswers: vi.fn().mockReturnValue(
        of({
          message: 'Guardado',
          assessment: {
            id: 1,
            studentId: 10,
            status: 'in_progress',
            answers: { selectedCells: ['K7', 'L8'] },
          },
        })
      ),
      completeAssessment: vi.fn().mockReturnValue(
        of({
          message: 'Completado',
          assessment: {
            id: 1,
            studentId: 10,
            status: 'completed',
            completedAt: '2026-11-24T10:30:00Z',
            answers: { selectedCells: [] },
            directScores: { AE: 70 },
            percentileScores: { A: 20 },
          },
        })
      ),
    };

    mockAuthService = {
      setPipgState: vi.fn(),
      refreshPipgStatus: vi.fn().mockReturnValue(of({ status: 'completed', completed: true })),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [PipgTestPage],
      providers: [
        { provide: PipgService, useValue: mockPipgService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PipgTestPage);
    component = fixture.componentInstance;
  });

  it('should create the PipgTestPage component and load initial assessment', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component).toBeTruthy();
    expect(mockPipgService.getAssessment).toHaveBeenCalled();
    expect(component.step).toBe('instructions');
    expect(component.answeredGroupsCount).toBe(0);
  });

  it('should restore existing saved progress from backend', async () => {
    // Grupo 1: J7 (K7/L7), J8 (K8/L8). Restore: K7 (+) and L8 (-)
    mockPipgService.getAssessment.mockReturnValue(
      of({
        assessment: {
          id: 1,
          studentId: 10,
          status: 'in_progress',
          answers: { selectedCells: ['K7', 'L8'] },
          directScores: null,
          percentileScores: null,
          startedAt: '2026-11-24T10:00:00Z',
          completedAt: null,
        },
      })
    );

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isGroupComplete(1)).toBe(true);
    expect(component.answeredGroupsCount).toBe(1);
    expect(component.progressPercentage).toBeGreaterThan(0);
  });

  it('should display completed view if assessment is already completed', async () => {
    mockPipgService.getAssessment.mockReturnValue(
      of({
        assessment: {
          id: 1,
          studentId: 10,
          status: 'completed',
          completedAt: '2026-11-24T09:00:00Z',
          answers: { selectedCells: [] },
          directScores: { AE: 65 },
          percentileScores: {},
        },
      })
    );

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.step).toBe('completed');
    expect(component.completedDate).toBe('2026-11-24T09:00:00Z');
    expect(mockAuthService.setPipgState).toHaveBeenCalledWith({
      status: 'completed',
      completed: true,
    });
  });

  it('should start answering and switch step to answering', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.startOrContinueTest();
    expect(component.step).toBe('answering');
  });

  it('should enforce mutual exclusivity when selecting plus and minus on same option', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.startOrContinueTest();

    const group = PIPG_QUESTION_GROUPS[0];
    const opt0 = group.options[0];
    const opt1 = group.options[1];

    // Select opt0 as (+)
    component.selectOption(group, opt0, 'plus');
    expect(component.isSelected(group.id, opt0.id, 'plus')).toBe(true);
    expect(component.isSelected(group.id, opt0.id, 'minus')).toBe(false);

    // If opt0 is now clicked as (-), plus should be deselected on opt0
    component.selectOption(group, opt0, 'minus');
    expect(component.isSelected(group.id, opt0.id, 'minus')).toBe(true);
    expect(component.isSelected(group.id, opt0.id, 'plus')).toBe(false);

    // Select opt1 as (+) -> now group has 1 plus and 1 minus
    component.selectOption(group, opt1, 'plus');
    expect(component.isCurrentQuestionValid()).toBe(true);
  });

  it('should validate before proceeding to next question', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.startOrContinueTest();

    // No answer selected
    await component.nextQuestion();
    expect(component.showValidation).toBe(true);
    expect(component.currentQuestionIndex).toBe(0);

    // Select 1 plus and 1 minus
    const group = PIPG_QUESTION_GROUPS[0];
    component.selectOption(group, group.options[0], 'plus');
    component.selectOption(group, group.options[1], 'minus');

    await component.nextQuestion();
    expect(component.showValidation).toBe(false);
    expect(component.currentQuestionIndex).toBe(1);
  });

  it('should navigate to previous question', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.startOrContinueTest();
    component.currentQuestionIndex = 2;

    component.previousQuestion();
    expect(component.currentQuestionIndex).toBe(1);
  });

  it('should jump to question from review and return', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.startOrContinueTest();

    component.goToReview();
    expect(component.step).toBe('review');

    component.jumpToQuestion(5);
    expect(component.step).toBe('answering');
    expect(component.currentQuestionIndex).toBe(5);
  });

  it('should complete assessment successfully when all 38 groups are answered', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    // Fill all 38 groups
    for (const q of PIPG_QUESTION_GROUPS) {
      component.answers[q.id] = {
        plus: q.options[0].id,
        minus: q.options[1].id,
      };
    }

    expect(component.isAllAnswered).toBe(true);
    await component.finishAssessment();

    expect(mockPipgService.completeAssessment).toHaveBeenCalled();
    expect(component.step).toBe('completed');
    expect(mockAuthService.setPipgState).toHaveBeenCalledWith({
      status: 'completed',
      completed: true,
    });
  });

  it('should display error if load fails', async () => {
    mockPipgService.getAssessment.mockReturnValue(
      throwError(() => ({ error: { error: 'Error de conexión' } }))
    );

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.errorMessage).toBe('Error de conexión');
  });

  it('should navigate back to /alumno on onBack', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/alumno']);
  });
});
