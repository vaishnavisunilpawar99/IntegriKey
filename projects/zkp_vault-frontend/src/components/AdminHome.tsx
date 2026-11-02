import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { ExamBuilder } from './ExamBuilder';
import './AdminDashboard.css';

export const AdminHome: React.FC = () => {
  const { logout } = useAuth();
  const [view, setView] = useState<'menu' | 'dashboard' | 'builder'>('menu');
  const [examId, setExamId] = useState('');

  if (view === 'dashboard') {
    return (
      <>
        <div className="view-header">
          <button className="back-btn" onClick={() => setView('menu')}>← Back</button>
          <button className="export-button" onClick={logout}>Logout</button>
        </div>
        <AdminDashboard examId={examId} appId={755317770} />
      </>
    );
  }

  if (view === 'builder') {
    return (
      <>
        <div className="view-header">
          <button className="back-btn" onClick={() => setView('menu')}>← Back</button>
          <button className="export-button" onClick={logout}>Logout</button>
        </div>
        <ExamBuilder />
      </>
    );
  }

  return (
    <div className="admin-dashboard" style={{ padding: '20px' }}>
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button className="export-button" onClick={logout}>Logout</button>
      </div>

      <div className="stats-grid" style={{ maxWidth: '600px', margin: '40px auto' }}>
        <div className="stat-card" style={{ flexDirection: 'column', textAlign: 'center' }}>
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">View Exam Submissions</div>
            <input
              type="text"
              placeholder="Exam ID"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              style={{ marginTop: '10px', width: '100%' }}
              className="search-input"
            />
            <button
              className="admin-btn"
              onClick={() => setView('dashboard')}
              disabled={!examId}
              style={{ marginTop: '20px', width: '100%' }}
            >
              View Dashboard
            </button>
          </div>
        </div>

        <div className="stat-card" style={{ flexDirection: 'column', textAlign: 'center' }}>
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-label">Exam Builder</div>
            <button
              className="create-btn"
              onClick={() => setView('builder')}
              style={{ marginTop: '20px', width: '100%' }}
            >
              Create / Edit Exams
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
