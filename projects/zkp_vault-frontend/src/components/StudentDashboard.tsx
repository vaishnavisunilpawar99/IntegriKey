import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { StudentExam } from './StudentExam';

// Helper to generate the same student hash as in StudentExam
async function hashStudentId(studentId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${studentId}_IntegriKey`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const StudentDashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const { accountAddress } = useWallet();
  const [examId, setExamId] = useState('');
  const [startExam, setStartExam] = useState(false);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [takenDate, setTakenDate] = useState<string | null>(null);
  const studentId = user?.email || 'student';

  useEffect(() => {
    const checkIfTaken = async () => {
      if (!examId || !studentId) {
        setAlreadyTaken(false);
        setTakenDate(null);
        return;
      }

      try {
        const studentHash = await hashStudentId(studentId);
        const allProofs = JSON.parse(localStorage.getItem('zkp_vault_proofs') || '[]');
        const existing = allProofs.find((p: any) => p.examId === examId && p.studentHash === studentHash);
        if (existing) {
          setAlreadyTaken(true);
          setTakenDate(new Date(existing.timestamp).toLocaleString());
        } else {
          setAlreadyTaken(false);
          setTakenDate(null);
        }
      } catch (error) {
        console.error('Failed to check exam status:', error);
      }
    };

    checkIfTaken();
  }, [examId, studentId]);

  if (startExam) {
    return (
      <StudentExam
        examId={examId}
        studentId={studentId}
        examDuration={60}
        onComplete={() => setStartExam(false)}
      />
    );
  }

  return (
    <div className="admin-dashboard" style={{ padding: '20px' }}>
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <button className="export-button" onClick={logout}>Logout</button>
      </div>

      <div className="stats-grid" style={{ maxWidth: '600px', margin: '40px auto' }}>
        <div className="stat-card" style={{ flexDirection: 'column', textAlign: 'center' }}>
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-label">Enter Exam ID</div>
            <input
              type="text"
              placeholder="e.g., MATH101"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              style={{ marginTop: '10px', width: '100%' }}
              className="search-input"
            />

            {alreadyTaken && (
              <p style={{ color: '#ffaa00', marginTop: '8px', fontSize: '14px' }}>
                ⚠️ You have already taken this exam on {takenDate}.
              </p>
            )}

            {!accountAddress && (
              <p style={{ color: '#ffaa00', marginTop: '8px', fontSize: '14px' }}>
                ⚠️ Please connect your wallet first.
              </p>
            )}

            <button
              className="start-button"
              onClick={() => setStartExam(true)}
              disabled={!examId || !accountAddress || alreadyTaken}
              style={{ marginTop: '20px', width: '100%' }}
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
