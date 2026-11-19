import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'psychologist/agenda' // TEMPORAL: Redirigir directo al calendario mientras se desarrolla
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then((m) => m.Login)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register')
        .then((m) => m.Register)
  },
  {
    path: 'psychologist/agenda',
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
    // canActivate: [roleGuard(['psicologo'])], // TEMPORAL: Desactivado para entrar directo
    pathMatch: 'full',
    redirectTo: 'psychologist/agenda'
  },
  {
    path: 'portal-alumno',
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
    loadComponent: () =>
      import('./features/patient/pages/availability/availability')
        .then((m) => m.Availability)
  },
  {
    path: 'patient/appointments',
    loadComponent: () =>
      import('./features/patient/pages/appointments/appointments')
        .then((m) => m.Appointments)
  },
   /*
  {
   path: 'psychologist',
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
  */
  {
    path: '**',
    redirectTo: 'pychologist/agenda'
  }
];