
import { Routes } from '@angular/router';

import {
  authGuard,
  guestGuard,
  roleGuard,
  pipgGuard,
  pipgRequiredGuard
} from './core/guards/auth.guard';

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
    path: 'pipg-test',
    canActivate: [
      authGuard,
      roleGuard(['alumno']),
      pipgGuard
    ],
    loadComponent: () =>
      import('./features/psychologist/pipg/pages/pipg-test/pipg-test.component')
        .then((m) => m.PipgTestComponent)
  },
  {
    path: 'portal-alumno',
    canActivate: [
      authGuard,
      roleGuard(['alumno']),
      pipgRequiredGuard
    ],
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
    canActivate: [
      authGuard,
      roleGuard(['alumno']),
      pipgRequiredGuard
    ],
    loadComponent: () =>
      import('./features/patient/pages/availability/availability')
        .then((m) => m.Availability)
  },
  {
    path: 'patient/appointments',
    canActivate: [
      authGuard,
      roleGuard(['alumno']),
      pipgRequiredGuard
    ],
    loadComponent: () =>
      import('./features/patient/pages/appointments/appointments')
        .then((m) => m.Appointments)
  },
  {
    path: 'psychologist',
    canActivate: [
      authGuard,
      roleGuard(['psicologo'])
    ],
    loadComponent: () =>
      import('./features/psychologist/psychologist-layout.component')
        .then((m) => m.PsychologistLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'agenda'
      },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./features/psychologist/pages/agenda/agenda')
            .then((m) => m.Agenda)
      },
      {
        path: 'calendar',
        pathMatch: 'full',
        redirectTo: 'agenda'
      },
      {
        path: 'test',
        loadComponent: () =>
          import('./features/psychologist/pipg/pages/pipg-results/pipg-results.component')
            .then((m) => m.PipgResultsComponent)
      }
    ]
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
    path: '**',
    redirectTo: 'login'
  }
];
