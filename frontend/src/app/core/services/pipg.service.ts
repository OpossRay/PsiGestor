
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PipgAssessmentStatus = 'in_progress' | 'completed';

export interface PipgAssessment {
    id: number;
    studentId: number;
    studentName?: string;
    studentCode?: string;
    program?: string;
    semester?: number;
    status: PipgAssessmentStatus;
    answers: {
        selectedCells: string[];
        isSynthetic?: boolean;
        disclaimer?: string;
    };
    directScores: Record<string, number> | null;
    percentileScores: Record<string, number | null> | null;
    startedAt: string | null;
    completedAt: string | null;
}

export interface PipgAssessmentResponse {
    assessment: PipgAssessment;
}

export interface PipgResultsResponse {
    assessments: PipgAssessment[];
}

@Injectable({
    providedIn: 'root'
})
export class PipgService {
    private http = inject(HttpClient);
    private platformId = inject(PLATFORM_ID);

    private get baseUrl(): string {
        if (isPlatformServer(this.platformId)) {
            return `${environment.ssrApiUrl}/api/pipg`;
        }

        return `${environment.apiUrl}/api/pipg`;
    }

    getAssessment(): Observable<PipgAssessmentResponse> {
        return this.http.get<PipgAssessmentResponse>(
            `${this.baseUrl}/assessment`
        );
    }

    saveAnswers(
        selectedCells: string[]
    ): Observable<PipgAssessmentResponse> {
        return this.http.put<PipgAssessmentResponse>(
            `${this.baseUrl}/assessment/answers`,
            { answers: { selectedCells } }
        );
    }

    completeAssessment(
        selectedCells: string[]
    ): Observable<PipgAssessmentResponse> {
        return this.http.post<PipgAssessmentResponse>(
            `${this.baseUrl}/assessment/complete`,
            { answers: { selectedCells } }
        );
    }

    getResults(): Observable<PipgResultsResponse> {
        return this.http.get<PipgResultsResponse>(
            `${this.baseUrl}/results`
        );
    }
}
