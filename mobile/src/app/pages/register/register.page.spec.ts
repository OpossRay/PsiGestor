import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterPage } from './register.page';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('RegisterPage', () => {
  let component: RegisterPage;
  let fixture: ComponentFixture<RegisterPage>;
  let authServiceMock: { registerStudent: ReturnType<typeof vi.fn> };
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    authServiceMock = {
      registerStudent: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // Scenario 1: Registro exitoso con matrícula válida
  it('1. should register student successfully when valid data is provided', () => {
    component.name = 'Estudiante Disponible Diez';
    component.studentCode = 'DEMO2026010';
    component.email = 'estudiante.diez@itescam.edu.mx';
    component.password = 'SecurePass2026!';
    component.confirmPassword = 'SecurePass2026!';

    authServiceMock.registerStudent.mockReturnValue(
      of({
        message: 'Registro completado con éxito. Ahora puedes iniciar sesión.',
        user: {
          id: 5,
          name: 'Estudiante Disponible Diez',
          email: 'estudiante.diez@itescam.edu.mx',
          role: 'alumno',
        } as any,
      })
    );

    component.onSubmit();

    expect(authServiceMock.registerStudent).toHaveBeenCalledWith({
      name: 'Estudiante Disponible Diez',
      studentCode: 'DEMO2026010',
      email: 'estudiante.diez@itescam.edu.mx',
      password: 'SecurePass2026!',
    });

    expect(component.isLoading).toBe(false);
    expect(component.successMessage).toContain('Registro completado');
    expect(component.errorMessage).toBe('');

    vi.advanceTimersByTime(1800);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  // Scenario 2: Matrícula inexistente en el catálogo
  it('2. should display error when studentCode does not exist in catalog', () => {
    component.name = 'Alumno No Catalogo';
    component.studentCode = 'UNKNOWN999';
    component.email = 'unknown@itescam.edu.mx';
    component.password = 'SecurePass2026!';
    component.confirmPassword = 'SecurePass2026!';

    authServiceMock.registerStudent.mockReturnValue(
      throwError(() => ({
        error: {
          error: "La matrícula 'UNKNOWN999' no se encuentra en el catálogo oficial de estudiantes.",
        },
      }))
    );

    component.onSubmit();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      "La matrícula 'UNKNOWN999' no se encuentra en el catálogo oficial de estudiantes."
    );
    expect(component.successMessage).toBe('');
  });

  // Scenario 3: Matrícula ya registrada
  it('3. should display error when studentCode is already registered', () => {
    component.name = 'Alumno Duplicado';
    component.studentCode = 'DEMO2026001';
    component.email = 'nuevo.correo@itescam.edu.mx';
    component.password = 'SecurePass2026!';
    component.confirmPassword = 'SecurePass2026!';

    authServiceMock.registerStudent.mockReturnValue(
      throwError(() => ({
        error: {
          error: 'Esta matrícula ya cuenta con un usuario registrado y activo.',
        },
      }))
    );

    component.onSubmit();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Esta matrícula ya cuenta con un usuario registrado y activo.'
    );
    expect(component.successMessage).toBe('');
  });

  // Scenario 4: Correo con formato inválido
  it('4. should reject invalid email format on client side without calling API', () => {
    component.name = 'Estudiante Prueba';
    component.studentCode = 'DEMO2026011';
    component.email = 'correo-invalido-sin-arroba';
    component.password = 'SecurePass2026!';
    component.confirmPassword = 'SecurePass2026!';

    component.onSubmit();

    expect(authServiceMock.registerStudent).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe(
      'El correo electrónico no tiene un formato válido.'
    );
    expect(component.isLoading).toBe(false);
  });

  // Scenario 5: Correo duplicado en users
  it('5. should display error when email already exists in users', () => {
    component.name = 'Estudiante Prueba';
    component.studentCode = 'DEMO2026012';
    component.email = 'alumno.demo1@psigestor.demo';
    component.password = 'SecurePass2026!';
    component.confirmPassword = 'SecurePass2026!';

    authServiceMock.registerStudent.mockReturnValue(
      throwError(() => ({
        error: {
          error: 'Ya existe una cuenta registrada con este correo electrónico.',
        },
      }))
    );

    component.onSubmit();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Ya existe una cuenta registrada con este correo electrónico.'
    );
  });

  // Scenario 6: Contraseñas que no coinciden
  it('6. should reject submission when passwords do not match', () => {
    component.name = 'Estudiante Prueba';
    component.studentCode = 'DEMO2026013';
    component.email = 'prueba@itescam.edu.mx';
    component.password = 'Password123!';
    component.confirmPassword = 'DifferentPassword456!';

    component.onSubmit();

    expect(authServiceMock.registerStudent).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('Las contraseñas no coinciden.');
    expect(component.isLoading).toBe(false);
  });

  // Scenario 7: Contraseña menor a 6 caracteres
  it('7. should reject password shorter than 6 characters', () => {
    component.name = 'Estudiante Prueba';
    component.studentCode = 'DEMO2026014';
    component.email = 'prueba@itescam.edu.mx';
    component.password = '12345';
    component.confirmPassword = '12345';

    component.onSubmit();

    expect(authServiceMock.registerStudent).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe(
      'La contraseña debe tener al menos 6 caracteres.'
    );
  });

  // Scenario 8: Error de conexión con el backend
  it('8. should handle network or server error gracefully', () => {
    component.name = 'Estudiante Prueba';
    component.studentCode = 'DEMO2026010';
    component.email = 'prueba@itescam.edu.mx';
    component.password = 'SecurePass2026!';
    component.confirmPassword = 'SecurePass2026!';

    authServiceMock.registerStudent.mockReturnValue(
      throwError(() => new Error('Network failure'))
    );

    component.onSubmit();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('No se pudo completar el registro.');
  });

  // Scenario 9: Prevención de doble envío
  it('9. should prevent duplicate submissions while request is in flight', () => {
    component.name = 'Estudiante Prueba';
    component.studentCode = 'DEMO2026010';
    component.email = 'prueba@itescam.edu.mx';
    component.password = 'SecurePass2026!';
    component.confirmPassword = 'SecurePass2026!';
    component.isLoading = true;

    component.onSubmit();

    expect(authServiceMock.registerStudent).not.toHaveBeenCalled();
  });

  // Scenario 10: Toggling de visibilidad de contraseñas
  it('10. should toggle password visibility states correctly', () => {
    expect(component.showPassword).toBe(false);
    expect(component.showConfirmPassword).toBe(false);

    component.togglePassword();
    expect(component.showPassword).toBe(true);

    component.togglePassword();
    expect(component.showPassword).toBe(false);

    component.toggleConfirmPassword();
    expect(component.showConfirmPassword).toBe(true);

    component.toggleConfirmPassword();
    expect(component.showConfirmPassword).toBe(false);
  });
});
