import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonModal,
  IonContent,
  IonIcon,
  IonSpinner,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  searchOutline,
  closeCircle,
  checkmarkCircle,
  businessOutline,
  videocamOutline,
  chevronDownOutline,
  chevronUpOutline,
  calendarOutline,
  timeOutline
} from 'ionicons/icons';
import { Availability, Student } from '../../../../core/models/availability.model';
import { CalendarService } from '../../../../core/services/calendar.service';
import {
  BottomNavComponent,
  BottomNavTab
} from '../../../../shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-booking-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonModal,
    IonContent,
    IonIcon,
    IonSpinner,
    BottomNavComponent
  ],
  templateUrl: './booking-modal.component.html',
  styleUrls: ['./booking-modal.component.scss']
})
export class BookingModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() slot: Availability | null = null;
  @Input() allAvailabilities: Availability[] = [];
  @Input() activeTab: BottomNavTab | string = 'gestion-citas';

  @Output() closeModal = new EventEmitter<void>();
  @Output() appointmentCreated = new EventEmitter<void>();
  @Output() tabSelect = new EventEmitter<BottomNavTab>();

  private calendarService = inject(CalendarService);
  private toastController = inject(ToastController);

  currentSlot: Availability | null = null;
  isSlotPickerOpen = false;

  bookingForm = {
    studentSearch: '',
    selectedStudent: null as Student | null,
    modality: 'In person' as 'In person' | 'Online',
    location: 'Consultorio de Psicopedagogía',
    reason: ''
  };

  studentSearchResults: Student[] = [];
  isSearchingStudents = false;
  isSavingAppointment = false;

  constructor() {
    addIcons({
      arrowBackOutline,
      searchOutline,
      closeCircle,
      checkmarkCircle,
      businessOutline,
      videocamOutline,
      chevronDownOutline,
      chevronUpOutline,
      calendarOutline,
      timeOutline
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.initModal();
    } else if (changes['slot'] && this.isOpen) {
      if (this.slot && !this.isSlotInPast(this.slot)) {
        this.currentSlot = this.slot;
      }
    }
  }

  private initModal(): void {
    this.resetForm();
    this.isSlotPickerOpen = false;

    if (this.slot && !this.isSlotInPast(this.slot)) {
      this.currentSlot = this.slot;
    } else {
      const availables = this.availableSlots;
      this.currentSlot = availables.length > 0 ? availables[0] : null;
    }
  }

  resetForm(): void {
    this.bookingForm = {
      studentSearch: '',
      selectedStudent: null,
      modality: 'In person',
      location: 'Consultorio de Psicopedagogía',
      reason: ''
    };
    this.studentSearchResults = [];
    this.isSearchingStudents = false;
    this.isSavingAppointment = false;
  }

  isSlotInPast(slot: Availability | null): boolean {
    if (!slot || !slot.date) return false;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // Si la fecha es anterior al día de hoy, ya pasó
    if (slot.date < todayStr) return true;

    // Si es hoy, verificar si la hora de inicio ya transcurrió
    if (slot.date === todayStr && slot.startTime) {
      const currentHours = pad(now.getHours());
      const currentMinutes = pad(now.getMinutes());
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const slotStart = slot.startTime.substring(0, 5);
      return slotStart < currentTimeStr;
    }

    return false;
  }

  get availableSlots(): Availability[] {
    return (this.allAvailabilities || [])
      .filter(s => s.status === 'Disponible' && !this.isSlotInPast(s))
      .sort((a, b) => {
        const d = (a.date || '').localeCompare(b.date || '');
        if (d !== 0) return d;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
  }

  toggleSlotPicker(): void {
    this.isSlotPickerOpen = !this.isSlotPickerOpen;
  }

  selectSlot(slot: Availability): void {
    if (this.isSlotInPast(slot)) {
      this.showToast('No es posible seleccionar un horario que ya pasó.', 'warning');
      return;
    }
    this.currentSlot = slot;
    this.isSlotPickerOpen = false;
  }

  formatSlotDisplay(slot: Availability | null): string {
    if (!slot || this.isSlotInPast(slot)) {
      return 'No hay espacios disponibles futuros seleccionados';
    }
    const dateFormatted = this.formatSlotDate(slot.date);
    const start12 = this.formatTime12h(slot.startTime);
    const end12 = this.formatTime12h(slot.endTime);
    return `${dateFormatted} · ${start12} – ${end12}`;
  }

  formatSlotDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (!year || !month || !day) return dateStr;
      const d = new Date(year, month - 1, day);
      const shortDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return `${shortDays[d.getDay()]}, ${day} ${months[d.getMonth()]}`;
    } catch {
      return dateStr;
    }
  }

  formatTime12h(timeStr?: string): string {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ? mStr.padStart(2, '0') : '00';
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return `${h12}:${m} ${period}`;
  }

  getStudentInitials(name?: string): string {
    if (!name) return 'AL';
    const clean = name.trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  }

  onStudentSearchInput(value: string): void {
    this.bookingForm.studentSearch = value;
    if (!value || value.trim().length < 2) {
      this.studentSearchResults = [];
      return;
    }

    this.isSearchingStudents = true;
    this.calendarService.searchStudents(value.trim()).subscribe({
      next: (students) => {
        this.studentSearchResults = students || [];
        this.isSearchingStudents = false;
      },
      error: () => {
        this.studentSearchResults = [];
        this.isSearchingStudents = false;
      }
    });
  }

  selectStudent(student: Student): void {
    this.bookingForm.selectedStudent = student;
    this.bookingForm.studentSearch = student.name;
    this.studentSearchResults = [];
  }

  clearStudent(): void {
    this.bookingForm.studentSearch = '';
    this.bookingForm.selectedStudent = null;
    this.studentSearchResults = [];
  }

  setModality(modality: 'In person' | 'Online'): void {
    this.bookingForm.modality = modality;
    if (modality === 'In person') {
      this.bookingForm.location = 'Consultorio de Psicopedagogía';
    } else {
      this.bookingForm.location = '';
    }
  }

  saveManualAppointment(): void {
    if (!this.currentSlot || this.isSlotInPast(this.currentSlot)) {
      this.showToast('Por favor selecciona un espacio de agenda disponible en fecha u hora futura.', 'warning');
      return;
    }

    if (!this.bookingForm.selectedStudent) {
      this.showToast('Por favor busca y selecciona a un alumno de la lista.', 'warning');
      return;
    }

    this.isSavingAppointment = true;

    this.calendarService.createAppointment({
      student_id: this.bookingForm.selectedStudent.id,
      student_name: this.bookingForm.selectedStudent.name,
      date: this.currentSlot.date,
      start_time: this.currentSlot.startTime,
      end_time: this.currentSlot.endTime,
      duration: this.currentSlot.duration || 45,
      modality: this.bookingForm.modality,
      location: this.bookingForm.modality === 'In person' ? this.bookingForm.location : undefined,
      reason: this.bookingForm.reason.trim() || 'Seguimiento de tutoría académica y técnica de estudio.'
    }).subscribe({
      next: async () => {
        this.isSavingAppointment = false;
        this.closeModal.emit();
        this.appointmentCreated.emit();
        await this.showToast('¡Cita registrada y confirmada exitosamente!', 'success');
      },
      error: async (err) => {
        this.isSavingAppointment = false;
        await this.showToast(err.error?.error || 'Error al agendar la cita.', 'danger');
      }
    });
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onNavTab(tab: BottomNavTab): void {
    this.closeModal.emit();
    this.tabSelect.emit(tab);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
