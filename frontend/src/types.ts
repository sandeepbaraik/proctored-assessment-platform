export type UserRole = 'ADMIN' | 'CANDIDATE';

export type AuthUser = {
  id: string;
  name?: string;
  email: string;
  role: UserRole;
};

export type Assessment = {
  _id: string;
  title: string;
  description: string;
  durationMinutes: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  proctoringRules?: Record<string, unknown>;
};

export type Question = {
  _id: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'SHORT_ANSWER';
  questionText: string;
  options: { label: string; text: string }[];
  correctAnswers?: string[];
  marks: number;
  order: number;
};

export type Assignment = {
  _id: string;
  assessmentId: Assessment;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  assignedAt: string;
};

export type AttemptState = {
  attempt: {
    _id: string;
    startedAt: string;
    expiresAt: string;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
    answers: { questionId: string; answer: string | string[] | null }[];
  };
  assessment: Assessment;
  questions: Question[];
};
