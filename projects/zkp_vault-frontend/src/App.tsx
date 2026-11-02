import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider, useWallet } from './context/WalletContext';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminHome } from './components/AdminHome';
import { SnackbarProvider } from 'notistack';
import './App.css';

function AppContent() {
  const { user } = useAuth();
  const { accountAddress, connectWallet, disconnectWallet, isWalletConnecting } = useWallet();
  const [isLoginView, setIsLoginView] = useState(true);

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {!accountAddress ? (
              <button
                className="connect-wallet-btn"
                onClick={connectWallet}
                disabled={isWalletConnecting}
                style={{ width: '100%' }}
              >
                {isWalletConnecting ? 'Connecting...' : '🔌 Connect Pera Wallet'}
              </button>
            ) : (
              <div className="connected-info" style={{ justifyContent: 'center' }}>
                <span className="wallet-address">
                  <code>{accountAddress.slice(0, 6)}...{accountAddress.slice(-4)}</code>
                </span>
                <button className="disconnect-btn" onClick={disconnectWallet}>
                  Disconnect
                </button>
              </div>
            )}
          </div>
          {isLoginView ? (
            <Login onToggleForm={() => setIsLoginView(false)} walletAddress={accountAddress} />
          ) : (
            <Signup onToggleForm={() => setIsLoginView(true)} walletAddress={accountAddress} />
          )}
        </div>
      </div>
    );
  }

  if (user.role === 'student') {
    return <StudentDashboard />;
  } else {
    return <AdminHome />;
  }
}

function App() {
  return (
    <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
      <AuthProvider>
        <WalletProvider>
          <AppContent />
        </WalletProvider>
      </AuthProvider>
    </SnackbarProvider>
  );
}

export default App;
