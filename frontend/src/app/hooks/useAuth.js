import { createContext, useContext, useState, useEffect } from 'react';
import { authLogin, authRegister, authLogout, getCurrentUser, saveUser } from '../services/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const user = await authLogin({ email, password });
      saveUser(user);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setIsLoading(true);
    try {
      const user = await authRegister({ name, email, password, role });
      // Don't auto-login after registration - user needs admin approval
      // saveUser(user);
      // setUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authLogout();
    setUser(null);
  };

  const updateUser = (nextUser) => {
    saveUser(nextUser);
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
