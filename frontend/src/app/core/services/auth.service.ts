
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, map } from 'rxjs';
import {
  AuthResponse,
  MeResponse,
  User,
  PipgState
} from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  currentUser = signal<User | null>(null);
  pipgState = signal<PipgState | null>(null);
  isLoading = signal<boolean>(false);

  private get baseUrl(): string {
    if (isPlatformServer(this.platformId)) {
      return 'http://backend:5000/api/auth';
    }

    return 'http://localhost:5000/api/auth';
  }

  checkSession(): Observable<User | null> {
    return this.http.get<MeResponse>(`${this.baseUrl}/me`).pipe(
      map(response => {
        const user = response.authenticated ? response.user : null;

        this.currentUser.set(user);
        this.pipgState.set(user ? response.pipg : null);

        return user;
      }),
      catchError(() => {
        this.currentUser.set(null);
        this.pipgState.set(null);
        return of(null);
      })
    );
  }

  login(credentials: {
    email: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/login`,
      credentials
    ).pipe(
      tap(response => {
        this.currentUser.set(response.user);
        this.pipgState.set(null);
      })
    );
  }

  registerStudent(payload: {
    name: string;
    email: string;
    password: string;
    studentCode: string;
    program?: string;
    semester?: number;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/register`,
      payload
    ).pipe(
      tap(response => {
        this.currentUser.set(response.user);
        this.pipgState.set(null);
      })
    );
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/logout`,
      {}
    ).pipe(
      tap(() => {
        this.currentUser.set(null);
        this.pipgState.set(null);
      }),
      catchError(() => {
        this.currentUser.set(null);
        this.pipgState.set(null);

        return of({
          message: 'Sesión cerrada localmente.'
        });
      })
    );
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  isPsicologo(): boolean {
    return this.currentUser()?.role === 'psicologo';
  }

  isAlumno(): boolean {
    return this.currentUser()?.role === 'alumno';
  }

  hasCompletedPipg(): boolean {
    return this.pipgState()?.status === 'completed';
  }
}
