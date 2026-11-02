import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

interface LoginProps {
  onToggleForm: () => void;
  walletAddress?: string | null;
}

export const Login: React.FC<LoginProps> = ({ onToggleForm }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password, role);
    if (!success) {
      setError('Invalid credentials or role');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login to IntegriKey</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as 'student' | 'admin')}>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="auth-btn">Login</button>
        </form>
        <p className="auth-toggle">
          Don't have an account? <button onClick={onToggleForm}>Sign Up</button>
        </p>
      </div>
    </div>
  );
};
