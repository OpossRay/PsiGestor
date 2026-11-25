import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  IonIcon,
  IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  documentTextOutline,
  clipboardOutline,
  checkmarkCircle,
  checkmarkOutline,
  alertCircleOutline,
  informationCircleOutline,
  cloudDoneOutline,
  cloudUploadOutline,
  refreshOutline,
  arrowForwardOutline,
  arrowBackOutline,
  gridOutline,
  closeOutline,
  timeOutline,
  helpCircleOutline,
} from 'ionicons/icons';
import { firstValueFrom, timeout } from 'rxjs';

import { PipgService } from '../../../../../core/services/pipg.service';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  PIPG_QUESTION_GROUPS,
  PipgOption,
  PipgQuestionGroup,
} from '../../data/pipg-question-groups.data';

export type PipgPageStep = 'instructions' | 'answering' | 'review' | 'completed';
export type SelectionType = 'plus' | 'minus';

export interface GroupAnswer {
  plus: string | null;
  minus: string | null;
}

@Component({
  selector: 'app-pipg-test',
  templateUrl: './pipg-test.page.html',
  styleUrls: ['./pipg-test.page.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner],
})
export class PipgTestPage implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly pipgService = inject(PipgService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly questions: PipgQuestionGroup[] = PIPG_QUESTION_GROUPS;

  answers: Record<number, GroupAnswer> = {};
  currentQuestionIndex = 0;
  step: PipgPageStep = 'instructions';

  isLoading = true;
  isSaving = false;
  isSubmitting = false;
  showValidation = false;
  showConfirmModal = false;

  saveStatus: 'saved' | 'saving' | 'dirty' | 'error' = 'saved';
  errorMessage = '';
  completedDate: string | null = null;

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savePromise: Promise<boolean> | null = null;
  private dirty = false;

  constructor() {
    addIcons({
      chevronBackOutline,
      documentTextOutline,
      clipboardOutline,
      checkmarkCircle,
      checkmarkOutline,
      alertCircleOutline,
      informationCircleOutline,
      cloudDoneOutline,
      cloudUploadOutline,
      refreshOutline,
      arrowForwardOutline,
      arrowBackOutline,
      gridOutline,
      closeOutline,
      timeOutline,
      helpCircleOutline,
    });
  }

  get currentQuestion(): PipgQuestionGroup | null {
    return this.questions[this.currentQuestionIndex] ?? null;
  }

  get answeredGroupsCount(): number {
    return this.questions.filter((q) => {
      const a = this.answers[q.id];
      return !!a?.plus && !!a?.minus && a.plus !== a.minus;
    }).length;
  }

  get progressPercentage(): number {
    if (this.questions.length === 0) return 0;
    return Math.round((this.answeredGroupsCount / this.questions.length) * 100);
  }

  get progressRatio(): number {
    if (this.questions.length === 0) return 0;
    return this.answeredGroupsCount / this.questions.length;
  }

  get isAllAnswered(): boolean {
    return this.answeredGroupsCount === this.questions.length;
  }

  ngOnInit(): void {
    void this.loadAssessment();
  }

  ngOnDestroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  async loadAssessment(): Promise<void> {
    this.isLoading = true;
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
        this.completedDate = assessment.completedAt;
        this.step = 'completed';
        this.authService.setPipgState({ status: 'completed', completed: true });
        return;
      }

      this.restoreAnswers(assessment.answers?.selectedCells ?? []);
      this.dirty = false;
      this.saveStatus = 'saved';

      // Si ya tiene avance previo, se queda en instructions mostrando el botón de continuar
    } catch (err: unknown) {
      const errorObj = err as { error?: { error?: string; message?: string }; message?: string };
      this.errorMessage =
        errorObj?.error?.error ??
        errorObj?.error?.message ??
        errorObj?.message ??
        'No fue posible cargar la evaluación. Revisa tu conexión a internet.';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private initializeAnswers(): void {
    this.answers = {};
    for (const q of this.questions) {
      this.answers[q.id] = { plus: null, minus: null };
    }
  }

  private restoreAnswers(selectedCells: string[]): void {
    if (!Array.isArray(selectedCells) || selectedCells.length === 0) {
      return;
    }

    for (const q of this.questions) {
      for (const opt of q.options) {
        if (selectedCells.includes(opt.plusCell)) {
          this.answers[q.id].plus = opt.id;
        }
        if (selectedCells.includes(opt.minusCell)) {
          this.answers[q.id].minus = opt.id;
        }
      }
    }

    // Ubicar el índice en la primera pregunta sin contestar
    const firstUnansweredIndex = this.questions.findIndex((q) => {
      const a = this.answers[q.id];
      return !a?.plus || !a?.minus || a.plus === a.minus;
    });

    if (firstUnansweredIndex > 0) {
      this.currentQuestionIndex = firstUnansweredIndex;
    }
  }

  startOrContinueTest(): void {
    this.step = 'answering';
    this.showValidation = false;
    this.errorMessage = '';
  }

  selectOption(question: PipgQuestionGroup, option: PipgOption, type: SelectionType): void {
    if (this.isSubmitting || this.isLoading || this.step === 'completed') {
      return;
    }

    const current = this.answers[question.id] ?? { plus: null, minus: null };
    const updated: GroupAnswer = { plus: current.plus, minus: current.minus };

    if (type === 'plus') {
      updated.plus = updated.plus === option.id ? null : option.id;
    } else {
      updated.minus = updated.minus === option.id ? null : option.id;
    }

    // Exclusión mutua: un mismo reactivo no puede ser (+) y (-) simultáneamente
    if (updated.plus === updated.minus && updated.plus !== null) {
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
    this.saveStatus = 'dirty';

    this.scheduleSave();
  }

  isSelected(questionId: number, optionId: string, type: SelectionType): boolean {
    const a = this.answers[questionId];
    return type === 'plus' ? a?.plus === optionId : a?.minus === optionId;
  }

  isGroupComplete(questionId: number): boolean {
    const a = this.answers[questionId];
    return !!a?.plus && !!a?.minus && a.plus !== a.minus;
  }

  isCurrentQuestionValid(): boolean {
    if (!this.currentQuestion) return false;
    return this.isGroupComplete(this.currentQuestion.id);
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

  async saveProgress(): Promise<boolean> {
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

    this.isSaving = true;
    this.saveStatus = 'saving';
    this.errorMessage = '';

    const operation = (async (): Promise<boolean> => {
      try {
        while (this.dirty) {
          this.dirty = false;
          const selectedCells = this.buildSelectedCells();
          await firstValueFrom(
            this.pipgService.saveAnswers(selectedCells).pipe(timeout(15000))
          );
        }

        this.saveStatus = 'saved';
        return true;
      } catch (err: unknown) {
        this.dirty = true;
        this.saveStatus = 'error';
        const errorObj = err as { error?: { error?: string }; message?: string };
        this.errorMessage =
          errorObj?.error?.error ??
          errorObj?.message ??
          'No se pudo sincronizar el avance con el servidor.';
        return false;
      } finally {
        this.isSaving = false;
        this.savePromise = null;
        this.cdr.markForCheck();
      }
    })();

    this.savePromise = operation;
    return operation;
  }

  private buildSelectedCells(): string[] {
    const cells: string[] = [];

    for (const q of this.questions) {
      const a = this.answers[q.id];
      if (!a) continue;

      if (a.plus) {
        const plusOpt = q.options.find((o) => o.id === a.plus);
        if (plusOpt) cells.push(plusOpt.plusCell);
      }

      if (a.minus) {
        const minusOpt = q.options.find((o) => o.id === a.minus);
        if (minusOpt) cells.push(minusOpt.minusCell);
      }
    }

    return cells;
  }

  async nextQuestion(): Promise<void> {
    if (this.isLoading || this.isSubmitting) return;

    if (!this.isCurrentQuestionValid()) {
      this.showValidation = true;
      return;
    }

    this.showValidation = false;
    await this.saveProgress();

    if (this.currentQuestionIndex === this.questions.length - 1) {
      this.step = 'review';
      return;
    }

    this.currentQuestionIndex++;
    this.cdr.markForCheck();
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0 && !this.isSubmitting) {
      this.currentQuestionIndex--;
      this.showValidation = false;
      this.errorMessage = '';
    }
  }

  goToReview(): void {
    void this.saveProgress();
    this.step = 'review';
    this.showValidation = false;
  }

  jumpToQuestion(index: number): void {
    if (index >= 0 && index < this.questions.length) {
      this.currentQuestionIndex = index;
      this.step = 'answering';
      this.showValidation = false;
      this.errorMessage = '';
    }
  }

  openConfirmModal(): void {
    if (!this.isAllAnswered) {
      this.errorMessage = 'Debes contestar los 38 grupos antes de finalizar la evaluación.';
      return;
    }
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
  }

  async confirmSubmit(): Promise<void> {
    this.showConfirmModal = false;
    await this.finishAssessment();
  }

  async finishAssessment(): Promise<void> {
    if (this.isSubmitting || this.isLoading || this.step === 'completed') {
      return;
    }

    if (!this.isAllAnswered) {
      this.errorMessage = 'Debes contestar los 38 grupos antes de finalizar la evaluación.';
      return;
    }

    this.errorMessage = '';
    const saved = await this.saveProgress();
    if (!saved) return;

    this.isSubmitting = true;

    try {
      const selectedCells = this.buildSelectedCells();

      if (selectedCells.length !== 76) {
        throw new Error(
          `Se esperaban 76 respuestas (2 por grupo), pero se registraron ${selectedCells.length}.`
        );
      }

      const response = await firstValueFrom(
        this.pipgService.completeAssessment(selectedCells).pipe(timeout(20000))
      );

      if (response?.assessment?.status !== 'completed') {
        throw new Error('El servidor no confirmó la finalización de la evaluación.');
      }

      this.completedDate = response.assessment.completedAt;
      this.step = 'completed';
      this.authService.setPipgState({ status: 'completed', completed: true });

      // Refrescar estado global de autenticación en segundo plano
      this.authService.refreshPipgStatus().subscribe();
    } catch (err: unknown) {
      const errorObj = err as { error?: { error?: string }; message?: string };
      this.errorMessage =
        errorObj?.error?.error ??
        errorObj?.message ??
        'No fue posible finalizar la evaluación. Inténtalo nuevamente.';
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  async onBack(): Promise<void> {
    if (this.step === 'answering' || this.step === 'review') {
      await this.saveProgress();
    }
    await this.router.navigate(['/alumno']);
  }

  getPartLabel(option: PipgOption): string {
    const labels: Record<string, string> = {
      J: 'PARTE 1',
      G: 'PARTE 2',
      D: 'PARTE 3',
      A: 'PARTE 4',
    };
    return labels[option.sourceColumn] ?? '';
  }

  getPartName(part: string): string {
    return part || 'PARTE 1';
  }
}
