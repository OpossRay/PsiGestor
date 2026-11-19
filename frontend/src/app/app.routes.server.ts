import {
  RenderMode,
  ServerRoute
} from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'login',
    renderMode: RenderMode.Client
  },
  {
    path: 'register',
    renderMode: RenderMode.Client
  },
  {
    path: 'portal-alumno',
    renderMode: RenderMode.Client
  },
  {
    path: 'calendar',
    renderMode: RenderMode.Client
  },
  {
    path: 'patient/availability',
    renderMode: RenderMode.Client
  },
  {
    path: 'patient/appointments',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
