// src/services/exam-storage.ts
import { Exam } from '../../types/exam.types';

const EXAMS_STORAGE_KEY = 'zkp_vault_exams';

export const saveExam = (exam: Exam): void => {
  const exams = getAllExams();
  // Prevent overwriting existing exam by ID
  if (exams.find(e => e.examId === exam.examId)) {
    throw new Error(`Exam with ID ${exam.examId} already exists.`);
  }
  exams.push(exam);
  localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams));
};

export const getExamById = (examId: string): Exam | null => {
  const exams = getAllExams();
  return exams.find(e => e.examId === examId) || null;
};

export const getAllExams = (): Exam[] => {
  const stored = localStorage.getItem(EXAMS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};
