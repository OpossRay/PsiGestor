import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CloseAppointmentPayload,
  CloseAppointmentResponse
} from '../models/appointment-closure.model';

/** Operación exclusiva de cierre; no agrega responsabilidades a CalendarService. */
@Injectable({ providedIn: 'root' })
export class AppointmentClosureService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private get baseUrl(): string {
    // Igual a la configuración temporal del CalendarService existente.
    return isPlatformServer(this.platformId)
      ? 'http://backend:5000'
      : 'http://localhost:5000';
  }

  closeAppointment(
    appointmentId: number,
    payload: CloseAppointmentPayload
  ): Observable<CloseAppointmentResponse> {
    return this.http.post<CloseAppointmentResponse>(
      `${this.baseUrl}/appointments/${appointmentId}/close`,
      payload,
      { withCredentials: true }
    );
  }
}
