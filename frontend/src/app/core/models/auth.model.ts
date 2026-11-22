
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'psicologo' | 'alumno';
  avatarUrl?: string;
  studentId?: number | null;
  studentCode?: string | null;
  program?: string | null;
  semester?: number | null;
  isActive: boolean;
  createdAt?: string;
}

export type PipgStatus = 'not_started' | 'in_progress' | 'completed';

export interface PipgState {
  status: PipgStatus;
  completed: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
  csrfToken?: string;
}

export interface MeResponse {
  authenticated: boolean;
  user: User | null;
  pipg: PipgState | null;
  csrfToken?: string;
}

export interface NavOption {
  label: string;
  route: string;
}
