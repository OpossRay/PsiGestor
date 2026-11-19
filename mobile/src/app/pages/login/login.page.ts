import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonSpinner
  ]
})
export class LoginPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  showPassword = false;
  errorMessage = '';
  isLoading = false;

  constructor() {
    addIcons({
      mailOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      alertCircleOutline
    });
  }

  ngOnInit(): void {
    const restoreError = this.authService.sessionRestoreError();
    if (restoreError) {
      this.errorMessage = restoreError;
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Por favor ingresa tu correo y contraseña.';
      return;
    }

    this.isLoading = true;
    this.authService.login({
      email: this.email.trim(),
      password: this.password
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.user.role === 'psicologo') {
          this.router.navigate(['/psicologo']);
        } else {
          // Hook preparado para evaluación/test inicial obligatorio a futuro (primer ingreso)
          if (this.checkStudentInitialTest(res.user)) {
            // A futuro: redirigir a la pantalla del test inicial
            // this.router.navigate(['/test-inicial']);
            this.router.navigate(['/alumno']);
          } else {
            this.router.navigate(['/alumno']);
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.error || 'No se pudo iniciar sesión. Verifica tus credenciales.';
        this.errorMessage = msg;
      }
    });
  }

  /**
   * Hook preparado para verificar si el alumno es de primer ingreso
   * y requiere realizar el test inicial antes de acceder a la agenda.
   * Por el momento se omite hasta que sea entregado por el equipo.
   */
  private checkStudentInitialTest(user: any): boolean {
    const isTestFeatureDelivered = false; // Activar a true cuando se entregue el test
    return isTestFeatureDelivered && !user?.has_completed_initial_test;
  }
}
