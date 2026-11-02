import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

interface SignupProps {
  onToggleForm: () => void;
  walletAddress?: string | null;
}

export const Signup: React.FC<SignupProps> = ({ onToggleForm }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [error, setError] = useState('');
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const success = await signup(email, password, role);
    if (!success) {
      setError('User already exists');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Sign Up for IntegriKey</h2>
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
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
          <button type="submit" className="auth-btn">Sign Up</button>
        </form>
        <p className="auth-toggle">
          Already have an account? <button onClick={onToggleForm}>Login</button>
        </p>
      </div>
    </div>
  );
};
