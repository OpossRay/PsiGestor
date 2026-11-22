
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

import { PipgService } from '../../../../../core/services/pipg.service';
import { AuthService } from '../../../../../core/services/auth.service';

import {
  PIPG_QUESTION_GROUPS,
  PipgOption,
  PipgQuestionGroup
} from '../../data/pipg-question-groups.data';

type SelectionType = 'plus' | 'minus';

interface GroupAnswer {
  plus: string | null;
  minus: string | null;
}

@Component({
  selector: 'app-pipg-test',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pipg-test.component.html',
  styleUrl: './pipg-test.component.css'
})
export class PipgTestComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly pipgService = inject(PipgService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly questions: PipgQuestionGroup[] = PIPG_QUESTION_GROUPS;

  answers: Record<number, GroupAnswer> = {};

  currentQuestionIndex = 0;

  loading = true;
  saving = false;
  navigating = false;
  submitting = false;

  showValidation = false;
  showReview = false;
  completed = false;

  saveMessage = '';
  errorMessage = '';

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savePromise: Promise<boolean> | null = null;
  private dirty = false;

  get currentQuestion(): PipgQuestionGroup | null {
    return this.questions[this.currentQuestionIndex] ?? null;
  }

  get answeredGroups(): number {
    return this.questions.filter(question => {
      const answer = this.answers[question.id];

      return !!answer?.plus && !!answer?.minus;
    }).length;
  }

  get progress(): number {
    return Math.round(
      (this.answeredGroups / this.questions.length) * 100
    );
  }

  ngOnInit(): void {
    void this.loadAssessment();
  }

  async loadAssessment(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    this.initializeAnswers();

    try {
      const response = await firstValueFrom(
        this.pipgService.getAssessment().pipe(timeout(15000))
      );

      const assessment = response?.assessment;

      if (!assessment) {
        throw new Error('No se recibió la evaluación del servidor.');
      }

      if (assessment.status === 'completed') {
        this.completed = true;
        return;
      }

      this.restoreAnswers(
        assessment.answers?.selectedCells ?? []
      );

      this.dirty = false;
    } catch (error: any) {
      console.error('[P-IPG] Error al cargar:', error);

      this.errorMessage =
        error?.error?.error ??
        error?.error?.message ??
        error?.message ??
        'No fue posible cargar la evaluación.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private initializeAnswers(): void {
    this.answers = {};

    for (const question of this.questions) {
      this.answers[question.id] = {
        plus: null,
        minus: null
      };
    }
  }

  private restoreAnswers(selectedCells: string[]): void {
    if (!Array.isArray(selectedCells)) {
      return;
    }

    for (const question of this.questions) {
      for (const option of question.options) {
        if (selectedCells.includes(option.plusCell)) {
          this.answers[question.id].plus = option.id;
        }

        if (selectedCells.includes(option.minusCell)) {
          this.answers[question.id].minus = option.id;
        }
      }
    }
  }

  selectOption(
    question: PipgQuestionGroup,
    option: PipgOption,
    type: SelectionType
  ): void {
    if (
      this.loading ||
      this.completed ||
      this.submitting ||
      this.navigating
    ) {
      return;
    }

    const current = this.answers[question.id];

    if (!current) {
      return;
    }

    const updated: GroupAnswer = {
      plus: current.plus,
      minus: current.minus
    };

    if (type === 'plus') {
      updated.plus =
        updated.plus === option.id ? null : option.id;
    } else {
      updated.minus =
        updated.minus === option.id ? null : option.id;
    }

    if (updated.plus === updated.minus) {
      if (type === 'plus') {
        updated.minus = null;
      } else {
        updated.plus = null;
      }
    }

    this.answers[question.id] = updated;

    this.dirty = true;
    this.showValidation = false;
    this.errorMessage = '';
    this.saveMessage = 'Cambios pendientes de guardar';

    this.scheduleSave();
  }

  isSelected(
    questionId: number,
    optionId: string,
    type: SelectionType
  ): boolean {
    const answer = this.answers[questionId];

    return type === 'plus'
      ? answer?.plus === optionId
      : answer?.minus === optionId;
  }

  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.saveProgress();
    }, 700);
  }

  private async saveProgress(): Promise<boolean> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    if (this.savePromise) {
      return this.savePromise;
    }

    if (!this.dirty) {
      return true;
    }

    this.saving = true;
    this.saveMessage = '';
    this.errorMessage = '';

    const operation = (async (): Promise<boolean> => {
      try {
        while (this.dirty) {
          this.dirty = false;

          const selectedCells = this.buildSelectedCells();

          await firstValueFrom(
            this.pipgService
              .saveAnswers(selectedCells)
              .pipe(timeout(15000))
          );
        }

        this.saveMessage = 'Avance guardado';
        return true;
      } catch (error: any) {
        this.dirty = true;

        console.error('[P-IPG] Error al guardar:', error);

        this.errorMessage =
          error?.error?.error ??
          error?.error?.message ??
          error?.message ??
          'No se pudieron guardar las respuestas. Inténtalo nuevamente.';

        this.saveMessage = 'Error al guardar';
        return false;
      } finally {
        this.saving = false;
        this.savePromise = null;
        this.cdr.markForCheck();
      }
    })();

    this.savePromise = operation;

    return operation;
  }


  private buildSelectedCells(): string[] {
    const cells: string[] = [];

    for (const question of this.questions) {
      const answer = this.answers[question.id];

      if (!answer) {
        continue;
      }

      if (answer.plus) {
        const plusOption = question.options.find(
          option => option.id === answer.plus
        );

        if (plusOption) {
          cells.push(plusOption.plusCell);
        }
      }

      if (answer.minus) {
        const minusOption = question.options.find(
          option => option.id === answer.minus
        );

        if (minusOption) {
          cells.push(minusOption.minusCell);
        }
      }
    }

    return cells;
  }


  isCurrentQuestionValid(): boolean {
    const question = this.currentQuestion;

    if (!question) {
      return false;
    }

    const answer = this.answers[question.id];

    return !!answer?.plus &&
      !!answer?.minus &&
      answer.plus !== answer.minus;
  }

  async nextQuestion(): Promise<void> {
    if (
      this.navigating ||
      this.loading ||
      this.submitting ||
      this.completed
    ) {
      return;
    }

    if (!this.isCurrentQuestionValid()) {
      this.showValidation = true;
      return;
    }

    this.showValidation = false;
    this.navigating = true;

    try {
      const saved = await this.saveProgress();

      if (!saved) {
        return;
      }

      if (this.currentQuestionIndex === this.questions.length - 1) {
        this.showReview = true;
        return;
      }

      this.currentQuestionIndex++;
      this.saveMessage = 'Avance guardado';
    } finally {
      this.navigating = false;
      this.cdr.markForCheck();
    }
  }

  previousQuestion(): void {
    if (
      this.currentQuestionIndex > 0 &&
      !this.navigating &&
      !this.loading &&
      !this.submitting
    ) {
      this.currentQuestionIndex--;
      this.showValidation = false;
    }
  }

  editQuestion(questionId: number): void {
    if (this.submitting || this.navigating) {
      return;
    }

    const index = this.questions.findIndex(
      question => question.id === questionId
    );

    if (index >= 0) {
      this.currentQuestionIndex = index;
      this.showReview = false;
      this.errorMessage = '';
    }
  }

  getOptionText(
    question: PipgQuestionGroup,
    optionId: string | null | undefined
  ): string {
    if (!optionId) {
      return 'Sin seleccionar';
    }

    return question.options.find(
      option => option.id === optionId
    )?.text ?? 'Sin seleccionar';
  }

  async logout(): Promise<void> {
    if (
      this.loading ||
      this.navigating ||
      this.submitting
    ) {
      return;
    }

    this.navigating = true;

    try {
      const saved = await this.saveProgress();

      if (!saved) {
        return;
      }

      await firstValueFrom(this.authService.logout());

      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('[P-IPG] Error al cerrar sesión:', error);

      this.errorMessage =
        'No fue posible cerrar la sesión.';
    } finally {
      this.navigating = false;
    }
  }


  async finishAssessment(): Promise<void> {
    if (
      this.submitting ||
      this.navigating ||
      this.loading ||
      this.completed
    ) {
      return;
    }

    if (this.answeredGroups !== this.questions.length) {
      this.errorMessage =
        'Debes responder los 38 grupos antes de finalizar.';
      return;
    }

    const confirmed = window.confirm(
      '¿Estás seguro de finalizar? Después no podrás modificar tus respuestas.'
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage = '';

    const saved = await this.saveProgress();

    if (!saved) {
      return;
    }

    this.submitting = true;

    try {
      const selectedCells = this.buildSelectedCells();

      if (selectedCells.length !== 76) {
        throw new Error(
          `Se esperaban 76 celdas seleccionadas, pero se encontraron ${selectedCells.length}.`
        );
      }

      const response = await firstValueFrom(
        this.pipgService
          .completeAssessment(selectedCells)
          .pipe(timeout(20000))
      );

      if (response?.assessment?.status !== 'completed') {
        throw new Error(
          'El servidor no confirmó que la evaluación estuviera completada.'
        );
      }

      // Actualizar el estado de autenticación desde el servidor
      await firstValueFrom(this.authService.checkSession());

      // Verificar que el servidor ya reconoce la evaluación como completada
      if (!this.authService.hasCompletedPipg()) {
        throw new Error(
          'La evaluación se completó, pero no se pudo actualizar el estado de la sesión.'
        );
      }

      this.completed = true;
      this.showReview = false;
      this.saveMessage = '';
      this.errorMessage = '';

      // Redirigir al portal del alumno
      const navigated = await this.router.navigate(['/portal-alumno']);

      if (!navigated) {
        throw new Error('No fue posible navegar al portal del alumno.');
      }

    } catch (error: any) {
      console.error('[P-IPG] Error al finalizar:', error);

      this.errorMessage =
        error?.error?.error ??
        error?.error?.message ??
        error?.message ??
        'No fue posible finalizar la evaluación. Inténtalo nuevamente.';
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
    }
  }


  getPartLabel(option: PipgOption): string {
    const labels: Record<string, string> = {
      J: 'PARTE 1',
      G: 'PARTE 2',
      D: 'PARTE 3',
      A: 'PARTE 4'
    };

    return labels[option.sourceColumn] ?? '';
  }
}
