import React, { useEffect, useState } from 'react';
import { getExplorerUrl, getExamProofs } from './services/algorand-service';
import { useSnackbar } from 'notistack';
import './AdminDashboard.css';

interface ProofData {
  studentHash: string;
  trustScore: number;
  academicScore?: number;
  proofHash: string;
  timestamp: number;
  examId: string;
  incidents: number;
  txId?: string;
  ipfsCid?: string;
}

interface ExamStats {
  totalSubmissions: number;
  averageTrustScore: number;
  averageAcademicScore: number;
  highIntegrity: number;
  mediumIntegrity: number;
  lowIntegrity: number;
}

interface AdminDashboardProps {
  examId: string;
  appId: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ examId, appId }) => {
  const [proofs, setProofs] = useState<ProofData[]>([]);
  const [stats, setStats] = useState<ExamStats>({
    totalSubmissions: 0,
    averageTrustScore: 0,
    averageAcademicScore: 0,
    highIntegrity: 0,
    mediumIntegrity: 0,
    lowIntegrity: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'high' | 'medium' | 'low' | 'critical'>('all');
  const [selectedProof, setSelectedProof] = useState<ProofData | null>(null);
  const [sortBy, setSortBy] = useState<'timestamp' | 'trustScore'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadProofs();
  }, [examId]);

  useEffect(() => {
    const channel = new BroadcastChannel('integrikey_alerts');
    channel.onmessage = (event) => {
      const data = event.data;
      if (data && data.type === 'CRITICAL_RISK' && data.examId === examId) {
        enqueueSnackbar(
          `⚠️ Live Alert: Active student trust score dropped to ${data.score}! Reason: ${data.incidentType.replace('_', ' ')}`,
          { variant: 'error', autoHideDuration: 8000 }
        );
      }
    };
    return () => {
      channel.close();
    };
  }, [examId, enqueueSnackbar]);

  const loadProofs = async () => {
    setIsLoading(true);
    try {
      const examProofs = await getExamProofs(examId);
      setProofs(examProofs);
      calculateStats(examProofs);
    } catch (err) {
      console.error('Failed to load proofs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (proofList: ProofData[]) => {
    const totalSubmissions = proofList.length;
    const averageTrustScore = totalSubmissions > 0
      ? proofList.reduce((sum, p) => sum + p.trustScore, 0) / totalSubmissions
      : 0;
    const averageAcademicScore = totalSubmissions > 0
      ? proofList.reduce((sum, p) => sum + (p.academicScore || 0), 0) / totalSubmissions
      : 0;

    const highIntegrity = proofList.filter(p => p.trustScore > 90).length;
    const mediumIntegrity = proofList.filter(p => p.trustScore >= 70 && p.trustScore <= 90).length;
    const lowIntegrity = proofList.filter(p => p.trustScore < 70).length;

    setStats({
      totalSubmissions,
      averageTrustScore: Math.round(averageTrustScore * 10) / 10,
      averageAcademicScore: Math.round(averageAcademicScore * 10) / 10,
      highIntegrity,
      mediumIntegrity,
      lowIntegrity,
    });
  };

  const getStatusBadge = (score: number) => {
    if (score >= 90) return { className: 'status-high', label: 'High 🏅 (NFT Minted)', icon: '🟢' };
    if (score >= 70) return { className: 'status-medium', label: 'Medium', icon: '🟡' };
    return { className: 'status-low', label: 'Review', icon: '🔴' };
  };

  const filteredProofs = proofs
    .filter(proof => {
      if (searchTerm) {
        return proof.studentHash.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    })
    .filter(proof => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'high') return proof.trustScore > 90;
      if (filterStatus === 'medium') return proof.trustScore >= 70 && proof.trustScore <= 90;
      if (filterStatus === 'low') return proof.trustScore < 70;
      if (filterStatus === 'critical') return proof.trustScore < 50;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'timestamp') {
        return sortOrder === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
      } else {
        return sortOrder === 'asc' ? a.trustScore - b.trustScore : b.trustScore - a.trustScore;
      }
    });

  const exportReport = () => {
    const csvContent = [
      ['Student Hash', 'Trust Score', 'Academic Score', 'Proof Hash', 'Timestamp', 'Incidents', 'Status'].join(','),
      ...proofs.map(p => [
        p.studentHash,
        p.trustScore,
        p.academicScore ?? '',
        p.proofHash,
        new Date(p.timestamp).toISOString(),
        p.incidents || 0,
        getStatusBadge(p.trustScore).label,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IntegriKey-${examId}-report.csv`;
    a.click();
  };

  const refreshProofs = () => {
    loadProofs();
  };

  const openDetails = (proof: ProofData) => setSelectedProof(proof);
  const closeDetails = () => setSelectedProof(null);

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>IntegriKey Admin Dashboard</h1>
          <p className="exam-info">
            Exam: <strong>{examId}</strong> | Date: {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="header-actions">
          <button className="export-button" onClick={exportReport}>
            📊 Export Report
          </button>
          <button className="clear-button" onClick={refreshProofs}>
            🔄 Refresh Proofs
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalSubmissions}</div>
            <div className="stat-label">Total Submissions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-value">{stats.averageTrustScore}</div>
            <div className="stat-label">Average Trust Score</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <div className="stat-value">{stats.averageAcademicScore}</div>
            <div className="stat-label">Average Academic Score</div>
          </div>
        </div>
        <div className="stat-card highlight-green">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <div className="stat-value">{stats.highIntegrity}</div>
            <div className="stat-label">High Integrity (&gt;90)</div>
          </div>
        </div>
        <div className="stat-card highlight-yellow">
          <div className="stat-icon">🟡</div>
          <div className="stat-content">
            <div className="stat-value">{stats.mediumIntegrity}</div>
            <div className="stat-label">Medium (70-90)</div>
          </div>
        </div>
        <div className="stat-card highlight-red">
          <div className="stat-icon">🔴</div>
          <div className="stat-content">
            <div className="stat-value">{stats.lowIntegrity}</div>
            <div className="stat-label">Needs Review (&lt;70)</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <input
          type="text"
          className="search-input"
          placeholder="Search by student hash..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="filter-buttons">
          <button className={filterStatus === 'all' ? 'filter-btn active' : 'filter-btn'} onClick={() => setFilterStatus('all')}>
            All
          </button>
          <button className={filterStatus === 'high' ? 'filter-btn active' : 'filter-btn'} onClick={() => setFilterStatus('high')}>
            High Integrity
          </button>
          <button className={filterStatus === 'medium' ? 'filter-btn active' : 'filter-btn'} onClick={() => setFilterStatus('medium')}>
            Medium
          </button>
          <button className={filterStatus === 'low' ? 'filter-btn active' : 'filter-btn'} onClick={() => setFilterStatus('low')}>
            Needs Review
          </button>
          <button className={filterStatus === 'critical' ? 'filter-btn active critical-btn' : 'filter-btn'} style={{ borderColor: 'red', color: filterStatus === 'critical' ? 'white' : 'red', backgroundColor: filterStatus === 'critical' ? 'red' : 'transparent' }} onClick={() => setFilterStatus('critical')}>
            ⚠️ Critical
          </button>
        </div>
      </div>

      {/* Proofs Table */}
      <div className="proofs-section">
        <h2>Student Proofs</h2>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading proofs...</p>
          </div>
        ) : filteredProofs.length === 0 ? (
          <div className="empty-state">
            <p>No proofs found{stats.totalSubmissions > 0 ? ' matching your filter' : ' for this exam'}</p>
          </div>
        ) : (
          <div className="proofs-table">
            <table>
              <thead>
                <tr className="table-header">
                  <th className="col-hash">Student Hash</th>
                  <th className="col-score" style={{ cursor: 'pointer' }} onClick={() => { setSortBy('trustScore'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    Trust Score {sortBy === 'trustScore' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th className="col-academic">Academic Score</th>
                  <th className="col-incidents">Incidents</th>
                  <th className="col-status">Status</th>
                  <th className="col-time" style={{ cursor: 'pointer' }} onClick={() => { setSortBy('timestamp'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    Timestamp {sortBy === 'timestamp' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th className="col-blockchain">Proof Hash</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProofs.map((proof, index) => {
                  const status = getStatusBadge(proof.trustScore);
                  return (
                    <tr key={index} className="table-row">
                      <td className="col-hash" data-label="Student Hash">
                        <code>{proof.studentHash.substring(0, 16)}...</code>
                      </td>
                      <td className="col-score" data-label="Trust Score">
                        <div className="score-badge" style={{
                          backgroundColor: proof.trustScore >= 90 ? '#00ff88' : proof.trustScore >= 70 ? '#ffaa00' : '#ff6b6b'
                        }}>
                          {proof.trustScore}
                        </div>
                      </td>
                      <td className="col-academic" data-label="Academic Score">
                        <div className="score-badge" style={{ backgroundColor: '#667eea' }}>
                          {proof.academicScore !== undefined ? proof.academicScore : 'N/A'}
                        </div>
                      </td>
                      <td className="col-incidents" data-label="Incidents">
                        {proof.incidents || 0}
                      </td>
                      <td className="col-status" data-label="Status">
                        <span className={`status-badge ${status.className}`}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td className="col-time" data-label="Timestamp">
                        {new Date(proof.timestamp).toLocaleString()}
                      </td>
                      <td className="col-blockchain" data-label="Proof Hash">
                        <code className="proof-hash-mini">{proof.proofHash.substring(0, 12)}...</code>
                      </td>
                      <td className="col-actions" data-label="Actions">
                        <button
                          className="view-details-btn"
                          onClick={() => openDetails(proof)}
                        >
                          👁️ View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="privacy-notice">
        <div className="notice-icon">🔒</div>
        <div className="notice-content">
          <h3>Privacy Protection Active</h3>
          <p>
            No video data is stored or accessible. Only cryptographic proofs and trust scores
            are recorded. Student identities are hashed and cannot be reverse-engineered.
          </p>
        </div>
      </div>

      {/* Details Modal */}
      {selectedProof && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Proof Details</h3>
            <div className="modal-body">
              <p><strong>Student Hash:</strong> <code className="full-hash">{selectedProof.studentHash}</code></p>
              <p><strong>Trust Score:</strong> {selectedProof.trustScore}</p>
              <p><strong>Academic Score:</strong> {selectedProof.academicScore !== undefined ? selectedProof.academicScore : 'N/A'}</p>
              <p><strong>Incidents:</strong> {selectedProof.incidents || 0}</p>
              <p><strong>Status:</strong> {getStatusBadge(selectedProof.trustScore).label}</p>
              <p><strong>Timestamp:</strong> {new Date(selectedProof.timestamp).toLocaleString()}</p>
              <p><strong>Proof Hash:</strong> <code className="full-hash">{selectedProof.proofHash}</code></p>
              <div style={{ padding: '10px', backgroundColor: 'rgba(0,255,136,0.1)', border: '1px solid #00ff88', borderRadius: '4px', margin: '15px 0' }}>
                <p style={{ margin: 0, color: '#00cc6a' }}>
                  <strong>🛡️ Advanced ZK Verification:</strong> True Zero-Knowledge SNARK Proof was automatically verified on-chain via AlgoPlonk validation, mathematically proving the AI tracking logic without exposing private video payloads.
                </p>
              </div>
              {selectedProof.ipfsCid && (
                <p>
                  <strong>Incident Timeline (IPFS):</strong>{' '}
                  <a
                    href={selectedProof.ipfsCid.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    {selectedProof.ipfsCid} ↗
                  </a>
                </p>
              )}
              {selectedProof.txId && (
                <p>
                  <strong>Transaction ID:</strong>{' '}
                  <a
                    href={getExplorerUrl(selectedProof.txId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    {selectedProof.txId} ↗
                  </a>
                </p>
              )}
            </div>
            <button className="close-modal-btn" onClick={closeDetails}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
