export type PipgStatus = 'not_started' | 'in_progress' | 'completed';

export interface PipgState {
  status: PipgStatus;
  completed: boolean;
}

export interface PipgAssessment {
  id: number;
  studentId: number;
  studentName?: string;
  studentCode?: string;
  program?: string;
  semester?: number;
  status: 'in_progress' | 'completed';
  answers: {
    selectedCells: string[];
    isSynthetic?: boolean;
    disclaimer?: string;
  };
  directScores: Record<string, number> | null;
  percentileScores: Record<string, number | null> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PipgAssessmentResponse {
  message?: string;
  assessment: PipgAssessment;
}

export interface PipgResultsResponse {
  assessments: PipgAssessment[];
}
