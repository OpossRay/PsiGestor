import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline,
  lockClosedOutline,
  mailOutline,
  idCardOutline,
  checkmarkCircleOutline,
  arrowBackOutline,
  eyeOutline,
  eyeOffOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardContent,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class RegisterPage {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = '';
  studentCode = '';
  email = '';
  password = '';
  confirmPassword = '';

  showPassword = false;
  showConfirmPassword = false;

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor() {
    addIcons({
      personOutline,
      lockClosedOutline,
      mailOutline,
      idCardOutline,
      checkmarkCircleOutline,
      arrowBackOutline,
      eyeOutline,
      eyeOffOutline,
      alertCircleOutline
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    const trimmedName = this.name.trim();
    const trimmedCode = this.studentCode.trim().toUpperCase();
    const trimmedEmail = this.email.trim();

    if (!trimmedName || !trimmedCode || !trimmedEmail || !this.password) {
      this.errorMessage = 'Completa todos los campos obligatorios.';
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      this.errorMessage = 'El correo electrónico no tiene un formato válido.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (!this.confirmPassword) {
      this.errorMessage = 'Por favor confirma tu contraseña.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.isLoading = true;
    this.authService.registerStudent({
      name: trimmedName,
      studentCode: trimmedCode,
      email: trimmedEmail,
      password: this.password
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res?.message || '¡Registro completado con éxito! Redirigiendo al login...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1800);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.error || 'No se pudo completar el registro.';
      }
    });
  }
}
