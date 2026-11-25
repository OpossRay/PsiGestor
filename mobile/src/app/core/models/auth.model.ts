import { PipgState } from './pipg.model';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'psicologo' | 'alumno';
  student_id?: number | null;
  student_code?: string | null;
  program?: string | null;
  semester?: number | null;
  has_completed_initial_test?: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface RefreshResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface MeResponse {
  authenticated: boolean;
  user: User | null;
  pipg?: PipgState | null;
}

