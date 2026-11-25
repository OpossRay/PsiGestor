import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EvaluacionesListViewComponent } from './evaluaciones-list-view.component';
import { PipgAssessment } from '../../../../core/models/pipg.model';

describe('EvaluacionesListViewComponent', () => {
  let component: EvaluacionesListViewComponent;
  let fixture: ComponentFixture<EvaluacionesListViewComponent>;

  const mockAssessments: PipgAssessment[] = [
    {
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
    },
    {
      id: 2,
      studentId: 11,
      studentName: 'Carlos Gómez Ruiz',
      studentCode: '20231154',
      program: 'Psicología',
      semester: 5,
      status: 'completed',
      answers: { selectedCells: [] },
      directScores: { A: 20, R: 21, E: 22, S: 19, AE: 82, C: 25, O: 22, P: 20, V: 21 },
      percentileScores: { A: 50, R: 40, E: 45, S: 38, C: 55, O: 50, P: 42, V: 44 },
      startedAt: '2026-11-21T09:00:00Z',
      completedAt: '2026-11-21T09:40:00Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluacionesListViewComponent, FormsModule],
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluacionesListViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the list view component', () => {
    expect(component).toBeTruthy();
  });

  it('should render all assessments when search query is empty', () => {
    component.assessments = mockAssessments;
    fixture.detectChanges();

    expect(component.filteredAssessments.length).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.eval-card-item');
    expect(cards.length).toBe(2);
    expect(compiled.textContent).toContain('Ana Morales López');
    expect(compiled.textContent).toContain('Carlos Gómez Ruiz');
  });

  it('should filter assessments by student name', () => {
    component.assessments = mockAssessments;
    component.searchQuery = 'Ana';
    fixture.detectChanges();

    expect(component.filteredAssessments.length).toBe(1);
    expect(component.filteredAssessments[0].studentName).toBe('Ana Morales López');
  });

  it('should filter assessments by student code / matrícula', () => {
    component.assessments = mockAssessments;
    component.searchQuery = '20231154';
    fixture.detectChanges();

    expect(component.filteredAssessments.length).toBe(1);
    expect(component.filteredAssessments[0].studentCode).toBe('20231154');
  });

  it('should clear search query with clearSearch()', () => {
    component.searchQuery = 'Carlos';
    component.clearSearch();
    expect(component.searchQuery).toBe('');
  });

  it('should emit selectAssessment when a card is clicked', () => {
    component.assessments = mockAssessments;
    fixture.detectChanges();

    const selectSpy = vi.spyOn(component.selectAssessment, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;
    const firstCard = compiled.querySelector('.eval-card-item') as HTMLElement;
    firstCard.click();

    expect(selectSpy).toHaveBeenCalledWith(mockAssessments[0]);
  });

  it('should emit refresh on refresh button click', () => {
    const refreshSpy = vi.spyOn(component.refresh, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;
    const refreshBtn = compiled.querySelector('.refresh-btn') as HTMLButtonElement;
    refreshBtn.click();

    expect(refreshSpy).toHaveBeenCalled();
  });

  it('should emit back on back button click', () => {
    const backSpy = vi.spyOn(component.back, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;
    const backBtn = compiled.querySelector('.topbar-icon-btn') as HTMLButtonElement;
    backBtn.click();

    expect(backSpy).toHaveBeenCalled();
  });

  it('should show loading state when isLoading is true', () => {
    component.isLoading = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.loading-card')).toBeTruthy();
  });

  it('should show error state when errorMessage is provided', () => {
    component.errorMessage = 'Error de conexión';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-card')).toBeTruthy();
    expect(compiled.textContent).toContain('Error de conexión');
  });

  it('should show general empty state when assessments is empty', () => {
    component.assessments = [];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-card')).toBeTruthy();
    expect(compiled.textContent).toContain('Aún no hay evaluaciones');
  });

  it('should show no results state when search returns nothing', () => {
    component.assessments = mockAssessments;
    component.searchQuery = 'EstudianteInexistente';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-card')).toBeTruthy();
    expect(compiled.textContent).toContain('Sin resultados');
  });
});
