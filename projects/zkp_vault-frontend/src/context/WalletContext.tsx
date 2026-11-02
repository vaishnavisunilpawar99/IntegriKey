import React, { createContext, useContext, useState, useEffect } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';

interface WalletContextType {
  accountAddress: string | null;
  peraWallet: PeraWalletConnect | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isWalletConnecting: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [peraWallet, setPeraWallet] = useState<PeraWalletConnect | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  useEffect(() => {
    const wallet = new PeraWalletConnect();
    setPeraWallet(wallet);
    wallet.reconnectSession()
      .then(accounts => {
        if (accounts.length) setAccountAddress(accounts[0]);
      })
      .catch(() => {});
  }, []);

  const connectWallet = async () => {
    if (!peraWallet) return;
    setIsWalletConnecting(true);
    try {
      const accounts = await peraWallet.connect();
      setAccountAddress(accounts[0]);
    } catch (error) {
      console.error('Connection failed', error);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const disconnectWallet = () => {
    peraWallet?.disconnect();
    setAccountAddress(null);
  };

  return (
    <WalletContext.Provider value={{ accountAddress, peraWallet, connectWallet, disconnectWallet, isWalletConnecting }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};
