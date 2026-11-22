
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PipgService, PipgAssessment } from '../../../../../core/services/pipg.service';

@Component({
  selector: 'app-pipg-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pipg-results.component.html',
  styleUrl: './pipg-results.component.css'
})
export class PipgResultsComponent implements OnInit {
  private pipgService = inject(PipgService);

  assessments = signal<PipgAssessment[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  selectedAssessment = signal<PipgAssessment | null>(null);

  ngOnInit(): void {
    this.loadResults();
  }

  loadResults(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.pipgService.getResults().subscribe({
      next: (response) => {
        this.assessments.set(response.assessments ?? []);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading P-IPG results:', error);
        this.errorMessage.set(
          'No fue posible cargar los resultados. Intenta nuevamente.'
        );
        this.isLoading.set(false);
      }
    });
  }

  selectAssessment(assessment: PipgAssessment): void {
    this.selectedAssessment.set(assessment);
  }

  closeDetails(): void {
    this.selectedAssessment.set(null);
  }

  getScoreEntries(
    scores: Record<string, number> | null
  ): { key: string; value: number }[] {
    if (!scores) return [];

    return Object.entries(scores).map(([key, value]) => ({
      key,
      value
    }));
  }

  getPercentileEntries(
    scores: Record<string, number | null> | null
  ): { key: string; value: number | null }[] {
    if (!scores) return [];

    return Object.entries(scores).map(([key, value]) => ({
      key,
      value
    }));
  }
}
