import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  closeCircle,
  refreshOutline,
  personOutline,
  calendarOutline,
  chevronForwardOutline,
  alertCircleOutline,
  clipboardOutline,
  arrowBackOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { PipgAssessment } from '../../../../core/models/pipg.model';

@Component({
  selector: 'app-evaluaciones-list-view',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonSpinner],
  templateUrl: './evaluaciones-list-view.component.html',
  styleUrls: ['./evaluaciones-list-view.component.scss'],
})
export class EvaluacionesListViewComponent {
  @Input() assessments: PipgAssessment[] = [];
  @Input() isLoading = false;
  @Input() errorMessage: string | null = null;

  @Output() selectAssessment = new EventEmitter<PipgAssessment>();
  @Output() refresh = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  searchQuery = '';

  constructor() {
    addIcons({
      searchOutline,
      closeCircle,
      refreshOutline,
      personOutline,
      calendarOutline,
      chevronForwardOutline,
      alertCircleOutline,
      clipboardOutline,
      arrowBackOutline,
      documentTextOutline,
    });
  }

  get filteredAssessments(): PipgAssessment[] {
    const list = this.assessments || [];
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter((item) => {
      const name = (item.studentName || '').toLowerCase();
      const code = (item.studentCode || '').toLowerCase();
      const program = (item.program || '').toLowerCase();
      return name.includes(q) || code.includes(q) || program.includes(q);
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  onSelect(assessment: PipgAssessment): void {
    this.selectAssessment.emit(assessment);
  }

  onRefreshClick(): void {
    this.refresh.emit();
  }

  onBackClick(): void {
    this.back.emit();
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
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  }
}
