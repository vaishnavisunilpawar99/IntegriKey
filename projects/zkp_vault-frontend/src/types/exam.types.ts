export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer?: string; // Optional, for auto-grading
}

export interface Exam {
  examId: string;          // Matches the existing examId used for proofs
  title: string;
  duration: number;        // In minutes, used by the existing timer
  questions: Question[];
  createdAt: number;
  createdBy?: string;      // Admin's address or ID
}
