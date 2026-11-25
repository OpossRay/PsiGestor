import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EvaluacionDetailModalComponent } from './evaluacion-detail-modal.component';
import { PipgAssessment } from '../../../../core/models/pipg.model';

describe('EvaluacionDetailModalComponent', () => {
  let component: EvaluacionDetailModalComponent;
  let fixture: ComponentFixture<EvaluacionDetailModalComponent>;

  const mockAssessment: PipgAssessment = {
    id: 101,
    studentId: 42,
    studentName: 'Ana Morales López',
    studentCode: '20240981',
    program: 'Ingeniería en Computación',
    semester: 3,
    status: 'completed',
    answers: {
      selectedCells: ['B7', 'I8'],
      isSynthetic: true,
    },
    directScores: {
      A: 25,
      R: 24,
      E: 28,
      S: 22,
      AE: 99,
      C: 30,
      O: 27,
      P: 25,
      V: 26,
    },
    percentileScores: {
      A: 73,
      R: 48,
      E: 78,
      S: 47,
      C: 79,
      O: 68,
      P: 53,
      V: 59,
    },
    startedAt: '2026-11-20T10:00:00Z',
    completedAt: '2026-11-20T10:35:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluacionDetailModalComponent],
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluacionDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the detail modal component', () => {
    expect(component).toBeTruthy();
  });

  it('should not render sheet when isOpen is false', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('assessment', mockAssessment);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.eval-modal-sheet')).toBeFalsy();
  });

  it('should render student information and dates when isOpen is true', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('assessment', mockAssessment);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.eval-modal-sheet')).toBeTruthy();
    expect(compiled.textContent).toContain('Ana Morales López');
    expect(compiled.textContent).toContain('20240981');
    expect(compiled.textContent).toContain('Ingeniería en Computación');
    expect(compiled.textContent).toContain('Semestre 3');
  });

  it('should render synthetic demo warning when isSynthetic is true', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('assessment', mockAssessment);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.synthetic-warning-box')).toBeTruthy();
    expect(compiled.textContent).toContain('DEMOSTRACIÓN SINTÉTICA');
  });

  it('should emit closeModal when close or return button is clicked', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('assessment', mockAssessment);
    fixture.detectChanges();

    const closeSpy = vi.spyOn(component.closeModal, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;

    const backBtn = compiled.querySelector('.btn-back-header') as HTMLButtonElement;
    expect(backBtn).toBeTruthy();
    backBtn.click();
    expect(closeSpy).toHaveBeenCalled();

    const returnBtn = compiled.querySelector('.btn-return-list') as HTMLButtonElement;
    expect(returnBtn).toBeTruthy();
    returnBtn.click();
    expect(closeSpy).toHaveBeenCalledTimes(2);
  });
});
