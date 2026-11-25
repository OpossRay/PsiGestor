import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PipgService } from './pipg.service';
import { environment } from '../../../environments/environment';

describe('PipgService', () => {
  let service: PipgService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/pipg`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PipgService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PipgService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch assessment via GET /api/pipg/assessment', () => {
    const mockAssessmentResponse = {
      assessment: {
        id: 1,
        studentId: 10,
        status: 'in_progress' as const,
        answers: { selectedCells: ['K7', 'L8'] },
        directScores: null,
        percentileScores: null,
        startedAt: '2026-11-24T10:00:00Z',
        completedAt: null,
      },
    };

    service.getAssessment().subscribe((res) => {
      expect(res.assessment.id).toBe(1);
      expect(res.assessment.status).toBe('in_progress');
      expect(res.assessment.answers.selectedCells).toEqual(['K7', 'L8']);
    });

    const req = httpMock.expectOne(`${baseUrl}/assessment`);
    expect(req.request.method).toBe('GET');
    req.flush(mockAssessmentResponse);
  });

  it('should save answers via PUT /api/pipg/assessment/answers', () => {
    const cells = ['K7', 'L8', 'K11', 'L12'];
    const mockSaveResponse = {
      message: 'Respuestas guardadas correctamente.',
      assessment: {
        id: 1,
        studentId: 10,
        status: 'in_progress' as const,
        answers: { selectedCells: cells },
        directScores: null,
        percentileScores: null,
        startedAt: '2026-11-24T10:00:00Z',
        completedAt: null,
      },
    };

    service.saveAnswers(cells).subscribe((res) => {
      expect(res.assessment.answers.selectedCells).toEqual(cells);
    });

    const req = httpMock.expectOne(`${baseUrl}/assessment/answers`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ answers: { selectedCells: cells } });
    req.flush(mockSaveResponse);
  });

  it('should complete assessment via POST /api/pipg/assessment/complete', () => {
    const cells = ['K7', 'L8'];
    const mockCompleteResponse = {
      message: 'Evaluación completada correctamente.',
      assessment: {
        id: 1,
        studentId: 10,
        status: 'completed' as const,
        answers: { selectedCells: cells },
        directScores: { A: 15, R: 18, E: 20, S: 14, C: 19, O: 22, P: 16, V: 21, AE: 67 },
        percentileScores: { A: 13, R: 15, E: 30, S: 11, C: 18, O: 33, P: 8, V: 27 },
        startedAt: '2026-11-24T10:00:00Z',
        completedAt: '2026-11-24T10:30:00Z',
      },
    };

    service.completeAssessment(cells).subscribe((res) => {
      expect(res.assessment.status).toBe('completed');
      expect(res.assessment.completedAt).toBe('2026-11-24T10:30:00Z');
      expect(res.assessment.directScores?.['AE']).toBe(67);
    });

    const req = httpMock.expectOne(`${baseUrl}/assessment/complete`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ answers: { selectedCells: cells } });
    req.flush(mockCompleteResponse);
  });

  it('should fetch results via GET /api/pipg/results', () => {
    const mockResultsResponse = {
      assessments: [
        {
          id: 1,
          studentId: 10,
          studentName: 'Juan Pérez',
          studentCode: '2024001',
          status: 'completed' as const,
          answers: { selectedCells: [] },
          directScores: { A: 20 },
          percentileScores: { A: 36 },
          startedAt: '2026-11-24T10:00:00Z',
          completedAt: '2026-11-24T10:30:00Z',
        },
      ],
    };

    service.getResults().subscribe((res) => {
      expect(res.assessments.length).toBe(1);
      expect(res.assessments[0].studentName).toBe('Juan Pérez');
    });

    const req = httpMock.expectOne(`${baseUrl}/results`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResultsResponse);
  });
});
