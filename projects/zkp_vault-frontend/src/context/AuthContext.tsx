import React, { createContext, useState, useContext, useEffect } from 'react';

interface User {
  email: string;
  role: 'student' | 'admin';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: 'student' | 'admin') => Promise<boolean>;
  signup: (email: string, password: string, role: 'student' | 'admin') => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('zkp_vault_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string, role: 'student' | 'admin'): Promise<boolean> => {
    // In a real app, you'd validate against a backend.
    // For demo, we accept any credentials and just check if user exists in localStorage.
    const users = JSON.parse(localStorage.getItem('zkp_vault_users') || '[]');
    const found = users.find((u: any) => u.email === email && u.password === password && u.role === role);
    if (found) {
      const user = { email, role };
      localStorage.setItem('zkp_vault_user', JSON.stringify(user));
      setUser(user);
      return true;
    }
    return false;
  };

  const signup = async (email: string, password: string, role: 'student' | 'admin'): Promise<boolean> => {
    const users = JSON.parse(localStorage.getItem('zkp_vault_users') || '[]');
    if (users.some((u: any) => u.email === email)) {
      return false; // user already exists
    }
    const newUser = { email, password, role };
    users.push(newUser);
    localStorage.setItem('zkp_vault_users', JSON.stringify(users));
    // Auto login after signup
    const user = { email, role };
    localStorage.setItem('zkp_vault_user', JSON.stringify(user));
    setUser(user);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('zkp_vault_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
