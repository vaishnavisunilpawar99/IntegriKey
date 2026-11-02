import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { createExam } from './services/algorand-service';
import './AdminDashboard.css';

// Types
interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer?: string;
}

interface Exam {
  examId: string;
  title: string;
  duration: number;
  questions: Question[];
  createdAt: number;
  createdBy?: string;
}

export const ExamBuilder: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [currentExam, setCurrentExam] = useState<Partial<Exam>>({
    examId: '',
    title: '',
    duration: 60,
    questions: [],
    createdAt: Date.now(),
  });
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const { accountAddress, peraWallet } = useWallet();

  // Load exams from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('zkp_vault_exams');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const sanitized = parsed.map((exam: any) => ({
          ...exam,
          questions: exam.questions || [],
        }));
        setExams(sanitized);
      } catch (e) {
        console.error('Failed to parse exams', e);
        setExams([]);
      }
    }
  }, []);

  const saveExams = (updatedExams: Exam[]) => {
    localStorage.setItem('zkp_vault_exams', JSON.stringify(updatedExams));
    setExams(updatedExams);
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      text: '',
      options: ['', '', '', ''],
      correctAnswer: '',
    };
    setCurrentExam({
      ...currentExam,
      questions: [...(currentExam.questions || []), newQuestion],
    });
  };

  const updateQuestion = (
    index: number,
    field: keyof Question,
    value: string | string[]
  ) => {
    const updatedQuestions = [...(currentExam.questions || [])];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setCurrentExam({ ...currentExam, questions: updatedQuestions });
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updatedQuestions = [...(currentExam.questions || [])];
    const options = [...updatedQuestions[qIndex].options];
    options[optIndex] = value;
    updatedQuestions[qIndex].options = options;
    setCurrentExam({ ...currentExam, questions: updatedQuestions });
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = (currentExam.questions || []).filter((_, i) => i !== index);
    setCurrentExam({ ...currentExam, questions: updatedQuestions });
  };

  const saveExam = async () => {
    if (
      !currentExam.examId ||
      !currentExam.title ||
      !currentExam.duration ||
      !currentExam.questions?.length
    ) {
      alert('Please fill in all exam details and add at least one question.');
      return;
    }

    // If editing, update existing exam
    if (editingExamId) {
      const updatedExams = exams.map(exam =>
        exam.examId === editingExamId
          ? {
            ...exam,
            title: currentExam.title!,
            duration: currentExam.duration!,
            questions: currentExam.questions!,
          }
          : exam
      );
      saveExams(updatedExams);
      setEditingExamId(null);
    } else {
      // Creating new exam – check for duplicate ID
      if (exams.some(e => e.examId === currentExam.examId)) {
        alert('An exam with this ID already exists. Please choose a different ID.');
        return;
      }

      try {
        if (!accountAddress || !peraWallet) {
          alert('Please connect your Admin Wallet to deploy the exam to Algorand.');
          return;
        }

        setIsDeploying(true);
        console.log(`Deploying Exam Box ${currentExam.examId} to Algorand...`);

        await createExam(
          currentExam.examId,
          currentExam.duration,
          50, // Default minimum trust score
          accountAddress,
          async (txns) => {
            const txnsToSign = txns.map(t => ({ txn: t, signers: [accountAddress] }));
            return (await peraWallet.signTransaction([txnsToSign])) as Uint8Array[];
          }
        );

        const newExam: Exam = {
          examId: currentExam.examId,
          title: currentExam.title,
          duration: currentExam.duration,
          questions: currentExam.questions,
          createdAt: Date.now(),
          createdBy: 'admin',
        };
        saveExams([...exams, newExam]);
        setIsDeploying(false);
        alert(`Successfully deployed ${currentExam.examId} to Algorand!`);
      } catch (error) {
        console.error('Failed to deploy exam box to Algorand:', error);
        setIsDeploying(false);
        alert('Failed to construct the Algorand storage box. Check console logs.');
        return; // Halt if blockchain creation fails
      }
    }

    // Reset form
    setCurrentExam({
      examId: '',
      title: '',
      duration: 60,
      questions: [],
      createdAt: Date.now(),
    });
  };

  const deleteExam = (examId: string) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      const updatedExams = exams.filter(e => e.examId !== examId);
      saveExams(updatedExams);
    }
  };

  const editExam = (exam: Exam) => {
    setCurrentExam({
      examId: exam.examId,
      title: exam.title,
      duration: exam.duration,
      questions: exam.questions,
      createdAt: exam.createdAt,
    });
    setEditingExamId(exam.examId);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditingExamId(null);
    setIsEditing(false);
    setCurrentExam({
      examId: '',
      title: '',
      duration: 60,
      questions: [],
      createdAt: Date.now(),
    });
  };

  return (
    <div className="admin-dashboard" style={{ padding: '20px' }}>
      <h1>📝 Exam Builder</h1>

      {/* Form to create/edit exam */}
      <div className="filters-section" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <h2>{editingExamId ? 'Edit Exam' : 'Create New Exam'}</h2>
        <input
          type="text"
          placeholder="Exam ID (unique, e.g., MATH101)"
          value={currentExam.examId}
          onChange={e => setCurrentExam({ ...currentExam, examId: e.target.value })}
          className="search-input"
          disabled={!!editingExamId} // Disable when editing
        />
        <input
          type="text"
          placeholder="Exam Title"
          value={currentExam.title}
          onChange={e => setCurrentExam({ ...currentExam, title: e.target.value })}
          className="search-input"
        />
        <input
          type="number"
          placeholder="Duration (minutes)"
          value={currentExam.duration}
          onChange={e => setCurrentExam({ ...currentExam, duration: parseInt(e.target.value) || 0 })}
          className="search-input"
        />

        <h3>Questions</h3>
        {currentExam.questions?.map((q, qIndex) => (
          <div key={q.id} className="proofs-section" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Question {qIndex + 1}</h4>
              <button onClick={() => removeQuestion(qIndex)} className="filter-btn" style={{ background: '#ff6b6b' }}>
                ❌ Remove
              </button>
            </div>
            <input
              type="text"
              placeholder="Question text"
              value={q.text}
              onChange={e => updateQuestion(qIndex, 'text', e.target.value)}
              className="search-input"
              style={{ marginBottom: '10px' }}
            />
            {q.options.map((opt, optIndex) => (
              <input
                key={optIndex}
                type="text"
                placeholder={`Option ${optIndex + 1}`}
                value={opt}
                onChange={e => updateOption(qIndex, optIndex, e.target.value)}
                className="search-input"
                style={{ marginBottom: '5px' }}
              />
            ))}
            <input
              type="text"
              placeholder="Correct answer (optional, must match an option exactly)"
              value={q.correctAnswer || ''}
              onChange={e => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
              className="search-input"
              style={{ marginTop: '5px', borderColor: '#00ff88' }}
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button onClick={addQuestion} className="export-button">
            ➕ Add Question
          </button>
          <button onClick={saveExam} className="export-button" style={{ background: 'linear-gradient(135deg, #00ff88 0%, #00cc6f 100%)' }} disabled={isDeploying}>
            {isDeploying ? '🚀 Deploying Box...' : editingExamId ? '✏️ Update Exam' : '💾 Save Exam'}
          </button>
          {editingExamId && (
            <button onClick={cancelEdit} className="filter-btn" style={{ background: '#ffaa00' }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List of existing exams */}
      <div className="proofs-section" style={{ marginTop: '40px' }}>
        <h2>Existing Exams</h2>
        {exams.length === 0 ? (
          <p className="empty-state">No exams created yet.</p>
        ) : (
          <div className="proofs-table">
            <table>
              <thead>
                <tr className="table-header">
                  <th>Exam ID</th>
                  <th>Title</th>
                  <th>Duration</th>
                  <th>Questions</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map(exam => (
                  <tr key={exam.examId} className="table-row">
                    <td data-label="Exam ID"><code>{exam.examId}</code></td>
                    <td data-label="Title">{exam.title}</td>
                    <td data-label="Duration">{exam.duration} min</td>
                    <td data-label="Questions">{exam.questions?.length ?? 0}</td>
                    <td data-label="Created">{new Date(exam.createdAt).toLocaleDateString()}</td>
                    <td data-label="Actions">
                      <button
                        onClick={() => editExam(exam)}
                        className="filter-btn"
                        style={{ background: '#667eea', marginRight: '8px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteExam(exam.examId)}
                        className="filter-btn"
                        style={{ background: '#ff6b6b' }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
