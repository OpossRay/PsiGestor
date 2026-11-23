import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';


export type AvailabilityRangeUnit =
  | 'days'
  | 'weeks'
  | 'months';


export interface RegularScheduleDayRequest {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}


export interface RegularScheduleBreakRequest {
  enabled: boolean;
  startTime: string;
  endTime: string;
}


export interface SaveRegularScheduleRequest {
  appointmentDuration: number;

  appointmentGapMinutes: number;

  availabilityRangeValue: number;

  availabilityRangeUnit:
    AvailabilityRangeUnit;

  workDays:
    RegularScheduleDayRequest[];

  break:
    RegularScheduleBreakRequest;
}


export interface RegularScheduleResponse {
  id: number;

  appointmentDuration: number;

  appointmentGapMinutes: number;

  availabilityRangeValue: number;

  availabilityRangeUnit:
    AvailabilityRangeUnit;

  break: {
    enabled: boolean;
    startTime: string | null;
    endTime: string | null;
  };

  workDays: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];

  createdAt: string;

  updatedAt: string;
}


@Injectable({
  providedIn: 'root'
})
export class RegularScheduleService {
  private readonly platformId = inject(PLATFORM_ID);

  private get apiUrl(): string {
    if (isPlatformServer(this.platformId)) {
      return environment.ssrApiUrl;
    }
    return environment.apiUrl;
  }


  constructor(
    private http: HttpClient
  ) {}


  getRegularSchedule():
    Observable<
      RegularScheduleResponse | null
    > {

    return this.http.get<
      RegularScheduleResponse | null
    >(
      `${this.apiUrl}/regular-schedule`
    );
  }


  saveRegularSchedule(
    data: SaveRegularScheduleRequest
  ): Observable<RegularScheduleResponse> {

    return this.http.put<
      RegularScheduleResponse
    >(
      `${this.apiUrl}/regular-schedule`,
      data
    );
  }

}