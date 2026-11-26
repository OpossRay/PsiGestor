import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AttendanceResult,
  CloseAppointmentPayload,
  ClosureAppointmentSummary,
  attendanceLabel
} from '../../models/appointment-closure.model';

@Component({
  selector: 'app-appointment-closure',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointment-closure.html',
  styleUrl: './appointment-closure.css'
})
export class AppointmentClosure {
  @Input({ required: true }) appointment!: ClosureAppointmentSummary;
  @Input() saving = false;
  @Input() serverError: string | null = null;

  @Output() dismiss = new EventEmitter<void>();
  @Output() submitClosure = new EventEmitter<CloseAppointmentPayload>();

  readonly maxNotesLength = 600;
  step: 'form' | 'confirm' = 'form';
  attendance: AttendanceResult | null = null;
  notes = '';
  attemptedContinue = false;

  get attendanceText(): string {
    return attendanceLabel(this.attendance);
  }

  selectAttendance(value: AttendanceResult): void {
    if (this.saving) return;
    this.attendance = value;
  }

  continue(): void {
    this.attemptedContinue = true;
    if (!this.attendance || this.saving) return;
    this.step = 'confirm';
  }

  back(): void {
    if (!this.saving) this.step = 'form';
  }

  cancel(): void {
    if (!this.saving) this.dismiss.emit();
  }

  confirm(): void {
    if (this.saving || !this.attendance || this.step !== 'confirm') return;
    this.submitClosure.emit({
      attendance_result: this.attendance,
      closure_notes: this.notes.trim()
    });
  }
}
