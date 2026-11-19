import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login')
        .then((m) => m.Login)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register')
        .then((m) => m.Register)
  },
  {
    path: 'psychologist/agenda',
    canActivate: [authGuard, roleGuard(['psicologo'])],
    loadComponent: () =>
      import('./features/psychologist/pages/agenda/agenda')
        .then((m) => m.Agenda)
  },
  {
    path: 'psychologist',
    pathMatch: 'full',
    redirectTo: 'psychologist/agenda'
  },
  {
    path: 'psychologist/calendar',
    pathMatch: 'full',
    redirectTo: 'psychologist/agenda'
  },
  {
    path: 'calendar',
    pathMatch: 'full',
    redirectTo: 'psychologist/agenda'
  },
  {
    path: 'portal-alumno',
    canActivate: [authGuard, roleGuard(['alumno'])],
    loadComponent: () =>
      import('./features/patient/pages/dashboard/dashboard')
        .then((m) => m.Dashboard)
  },
  {
    path: 'patient/dashboard',
    pathMatch: 'full',
    redirectTo: 'portal-alumno'
  },
  {
    path: 'patient/availability',
    canActivate: [authGuard, roleGuard(['alumno'])],
    loadComponent: () =>
      import('./features/patient/pages/availability/availability')
        .then((m) => m.Availability)
  },
  {
    path: 'patient/appointments',
    canActivate: [authGuard, roleGuard(['alumno'])],
    loadComponent: () =>
      import('./features/patient/pages/appointments/appointments')
        .then((m) => m.Appointments)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
