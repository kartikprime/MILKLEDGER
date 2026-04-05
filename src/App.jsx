import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { initDb } from './db';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerDetail from './pages/CustomerDetail';
import Summary from './pages/Summary';
import AdminPanel from './pages/AdminPanel';

function App() {
  const [auth, setAuth] = useState(null); // null = loading, false = not auth, {authenticated, role, userId, userName}
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Don't block on initDb — seed users lazily on first login
    initDb().catch(err => console.warn('initDb background seed:', err));
    const stored = localStorage.getItem('milkledger_auth');
    if (stored === 'true') {
      setAuth({
        authenticated: true,
        role: localStorage.getItem('milkledger_role') || 'user',
        userId: localStorage.getItem('milkledger_user_id') || '',
        userName: localStorage.getItem('milkledger_user_name') || '',
      });
    } else {
      setAuth(false);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid var(--color-primary-lighter)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Loading MILKLEDGER...</p>
        </div>
      </div>
    );
  }

  const isAuthenticated = auth && auth.authenticated;
  const isAdmin = isAuthenticated && auth.role === 'admin';

  const handleLogout = () => {
    localStorage.removeItem('milkledger_auth');
    localStorage.removeItem('milkledger_role');
    localStorage.removeItem('milkledger_user_id');
    localStorage.removeItem('milkledger_user_name');
    setAuth(false);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login setAuth={setAuth} /> : <Navigate to={isAdmin ? "/admin" : "/"} />} />
        <Route path="/" element={isAuthenticated ? <Dashboard onLogout={handleLogout} role={auth.role} /> : <Navigate to="/login" />} />
        <Route path="/customer/:id" element={isAuthenticated ? <CustomerDetail /> : <Navigate to="/login" />} />
        <Route path="/summary" element={isAuthenticated ? <Summary /> : <Navigate to="/login" />} />
        <Route path="/admin" element={isAdmin ? <AdminPanel onLogout={handleLogout} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
