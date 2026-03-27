import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBlockedOnLoad, setIsBlockedOnLoad] = useState(false);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('chatme_token');
    // Basic sanity check before hitting the server
    if (!token || typeof token !== 'string' || token.length > 500 || token.length < 10) {
      localStorage.removeItem('chatme_token');
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setIsBlockedOnLoad(false);
      setUser(data);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.isBlocked) {
        // Account blocked — keep token but show blocked screen
        setIsBlockedOnLoad(true);
      } else {
        localStorage.removeItem('chatme_token');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = (token) => {
    localStorage.setItem('chatme_token', token);
    fetchUser();
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('chatme_token');
    setUser(null);
    setIsBlockedOnLoad(false);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isBlockedOnLoad }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
