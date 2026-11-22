
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const checkUser = (user: any) => {
    if (!user) {
      return router.createUrlTree(['/login']);
    }

    return true;
  };

  if (authService.currentUser()) {
    return checkUser(authService.currentUser());
  }

  return authService.checkSession().pipe(
    map(user => checkUser(user))
  );
};

export const roleGuard = (
  allowedRoles: Array<'psicologo' | 'alumno'>
): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const checkRole = (user: any) => {
      if (!user) {
        return router.createUrlTree(['/login']);
      }

      if (allowedRoles.includes(user.role)) {
        return true;
      }

      if (user.role === 'psicologo') {
        return router.createUrlTree(['/psychologist/agenda']);
      }

      return router.createUrlTree(['/portal-alumno']);
    };

    if (authService.currentUser()) {
      return checkRole(authService.currentUser());
    }

    return authService.checkSession().pipe(
      map(user => checkRole(user))
    );
  };
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const checkGuest = (user: any) => {
    if (!user) {
      return true;
    }

    if (user.role === 'psicologo') {
      return router.createUrlTree(['/psychologist/agenda']);
    }

    return router.createUrlTree(['/portal-alumno']);
  };

  if (authService.currentUser()) {
    return checkGuest(authService.currentUser());
  }

  return authService.checkSession().pipe(
    map(user => checkGuest(user))
  );
};

export const pipgGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const checkAccess = (user: any) => {
    if (!user) {
      return router.createUrlTree(['/login']);
    }

    if (user.role === 'psicologo') {
      return router.createUrlTree(['/psychologist/agenda']);
    }

    const status = authService.pipgState()?.status;

    if (status === 'completed') {
      return router.createUrlTree(['/portal-alumno']);
    }

    return true;
  };

  if (authService.currentUser() && authService.pipgState()) {
    return checkAccess(authService.currentUser());
  }

  return authService.checkSession().pipe(
    map(user => checkAccess(user))
  );
};

export const pipgRequiredGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const checkAccess = (user: any) => {
    if (!user) {
      return router.createUrlTree(['/login']);
    }

    if (user.role === 'psicologo') {
      return router.createUrlTree(['/psychologist/agenda']);
    }

    if (authService.pipgState()?.status !== 'completed') {
      return router.createUrlTree(['/pipg-test']);
    }

    return true;
  };

  if (authService.currentUser() && authService.pipgState()) {
    return checkAccess(authService.currentUser());
  }

  return authService.checkSession().pipe(
    map(user => checkAccess(user))
  );
};
