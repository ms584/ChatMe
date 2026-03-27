import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/CallbackPage';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/AdminDashboard';

// Blocked account screen
const BlockedScreen = ({ logout }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100vh', gap: 16,
    background: 'var(--bg-1)', color: 'var(--text-primary)', fontFamily: 'var(--font)',
  }}>
    <div style={{ fontSize: 56 }}>🚫</div>
    <h1 style={{ fontSize: 22, margin: 0 }}>Account Blocked</h1>
    <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
      Your account has been blocked by the admin.
    </p>
    <button
      onClick={logout}
      style={{
        marginTop: 8, padding: '10px 24px',
        background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 8, color: '#818cf8', fontSize: 14, cursor: 'pointer',
      }}
    >
      Back to Login
    </button>
  </div>
);

// Smart root redirect based on role
const RootRedirect = () => {
  const { user, loading, isBlockedOnLoad, logout } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (isBlockedOnLoad) return <BlockedScreen logout={logout} />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/chat'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<CallbackPage />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute requiredRole="user">
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
