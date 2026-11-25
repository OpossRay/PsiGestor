import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  arrowBackOutline,
  personOutline,
  calendarOutline,
  timeOutline,
  schoolOutline,
  warningOutline,
  checkmarkCircle,
  informationCircleOutline,
  clipboardOutline,
} from 'ionicons/icons';
import { PipgAssessment } from '../../../../core/models/pipg.model';
import { PipgChartComponent } from '../pipg-chart/pipg-chart.component';

@Component({
  selector: 'app-evaluacion-detail-modal',
  standalone: true,
  imports: [CommonModule, IonIcon, PipgChartComponent],
  templateUrl: './evaluacion-detail-modal.component.html',
  styleUrls: ['./evaluacion-detail-modal.component.scss'],
})
export class EvaluacionDetailModalComponent {
  @Input() isOpen = false;
  @Input() assessment: PipgAssessment | null = null;
  @Output() closeModal = new EventEmitter<void>();

  constructor() {
    addIcons({
      closeOutline,
      arrowBackOutline,
      personOutline,
      calendarOutline,
      timeOutline,
      schoolOutline,
      warningOutline,
      checkmarkCircle,
      informationCircleOutline,
      clipboardOutline,
    });
  }

  onClose(): void {
    this.closeModal.emit();
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n: number) => String(n).padStart(2, '0');
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      const hours = pad(d.getHours());
      const mins = pad(d.getMinutes());
      return `${day}/${month}/${year} · ${hours}:${mins} hrs`;
    } catch {
      return dateStr;
    }
  }

  getDirectScoreEntries(
    scores: Record<string, number> | null | undefined
  ): { key: string; value: number }[] {
    if (!scores) return [];
    return Object.entries(scores).map(([key, value]) => ({ key, value }));
  }

  getPercentileScoreEntries(
    scores: Record<string, number | null> | null | undefined
  ): { key: string; value: number | null }[] {
    if (!scores) return [];
    return Object.entries(scores).map(([key, value]) => ({ key, value }));
  }
}
