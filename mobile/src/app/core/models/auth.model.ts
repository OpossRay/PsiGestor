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
}

export interface MeResponse {
  authenticated: boolean;
  user: User | null;
}
