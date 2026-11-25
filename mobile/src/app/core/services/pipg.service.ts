import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PipgAssessmentResponse,
  PipgResultsResponse,
} from '../models/pipg.model';

@Injectable({
  providedIn: 'root',
})
export class PipgService {
  private http = inject(HttpClient);

  private get baseUrl(): string {
    return `${environment.apiUrl}/api/pipg`;
  }

  getAssessment(): Observable<PipgAssessmentResponse> {
    return this.http.get<PipgAssessmentResponse>(`${this.baseUrl}/assessment`);
  }

  saveAnswers(selectedCells: string[]): Observable<PipgAssessmentResponse> {
    return this.http.put<PipgAssessmentResponse>(
      `${this.baseUrl}/assessment/answers`,
      { answers: { selectedCells } }
    );
  }

  completeAssessment(selectedCells: string[]): Observable<PipgAssessmentResponse> {
    return this.http.post<PipgAssessmentResponse>(
      `${this.baseUrl}/assessment/complete`,
      { answers: { selectedCells } }
    );
  }

  getResults(): Observable<PipgResultsResponse> {
    return this.http.get<PipgResultsResponse>(`${this.baseUrl}/results`);
  }
}
