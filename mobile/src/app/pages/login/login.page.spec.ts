import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginPage } from './login.page';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let authServiceMock: {
    sessionRestoreError: ReturnType<typeof signal<string | null>>;
    login: ReturnType<typeof vi.fn>;
  };
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    authServiceMock = {
      sessionRestoreError: signal<string | null>(null),
      login: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create login component', () => {
    expect(component).toBeTruthy();
  });

  it('should validate required fields before submission', () => {
    component.email = '';
    component.password = '';
    component.onSubmit();

    expect(authServiceMock.login).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('Por favor ingresa tu correo y contraseña.');
  });

  it('should authenticate student and navigate to /alumno', () => {
    component.email = 'estudiante.diez@itescam.edu.mx';
    component.password = 'SecurePass2026!';

    authServiceMock.login.mockReturnValue(
      of({
        message: 'Inicio de sesión exitoso.',
        user: {
          id: 5,
          name: 'Estudiante Disponible Diez',
          email: 'estudiante.diez@itescam.edu.mx',
          role: 'alumno',
        } as any,
      })
    );

    component.onSubmit();

    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'estudiante.diez@itescam.edu.mx',
      password: 'SecurePass2026!',
    });
    expect(component.isLoading).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/alumno']);
  });

  it('should authenticate psychologist and navigate to /psicologo', () => {
    component.email = 'psicologa@itescam.edu.mx';
    component.password = 'StrongPsychPassword2026!';

    authServiceMock.login.mockReturnValue(
      of({
        message: 'Inicio de sesión exitoso.',
        user: {
          id: 1,
          name: 'Psicóloga Institucional',
          email: 'psicologa@itescam.edu.mx',
          role: 'psicologo',
        } as any,
      })
    );

    component.onSubmit();

    expect(navigateSpy).toHaveBeenCalledWith(['/psicologo']);
  });

  it('should display error message on invalid credentials', () => {
    component.email = 'wrong@itescam.edu.mx';
    component.password = 'WrongPass123';

    authServiceMock.login.mockReturnValue(
      throwError(() => ({
        error: { error: 'Credenciales inválidas' },
      }))
    );

    component.onSubmit();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Credenciales inválidas');
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword).toBe(false);
    component.togglePassword();
    expect(component.showPassword).toBe(true);
    component.togglePassword();
    expect(component.showPassword).toBe(false);
  });
});
