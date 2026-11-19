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
    path: 'calendar',
    canActivate: [authGuard, roleGuard(['psicologo'])],
    loadComponent: () =>
      import('./features/calendar/components/calendar/calendar')
        .then((m) => m.Calendar)
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
    path: 'psychologist',
    canActivate: [authGuard, roleGuard(['psicologo'])],
    loadComponent: () =>
      import('./features/psychologist/psychologist-layout.component')
        .then(m => m.PsychologistLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'calendar',
        pathMatch: 'full'
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/components/calendar/calendar')
            .then((m) => m.Calendar)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
