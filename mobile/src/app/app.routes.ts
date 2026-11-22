import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage),
    canActivate: [guestGuard]
  },
  {
    path: 'psicologo',
    loadComponent: () => import('./pages/psicologo/psicologo.page').then(m => m.PsicologoPage),
    canActivate: [authGuard, roleGuard(['psicologo'])]
  },
  {
    path: 'alumno',
    loadComponent: () => import('./pages/alumno/alumno.page').then(m => m.AlumnoPage),
    canActivate: [authGuard, roleGuard(['alumno'])]
  },
  {
    path: 'tabs',
    redirectTo: 'alumno',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
