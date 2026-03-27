import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CallbackPage = () => {
  const [searchParams] = useSearchParams();
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login?error=auth_failed');
      return;
    }

    if (token) {
      // Validate token looks like a real JWT (3 base64 parts) before storing
      const parts = token.split('.');
      if (parts.length !== 3 || token.length < 10 || token.length > 500) {
        navigate('/login?error=invalid_token');
        return;
      }
      // Immediately strip the token from the URL / browser history
      window.history.replaceState({}, document.title, window.location.pathname);
      login(token);
    } else {
      navigate('/login?error=no_token');
    }
  }, []);

  // After login() updates user, navigate to the correct page
  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/chat', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Authenticating with GitHub…</p>
    </div>
  );
};

export default CallbackPage;
