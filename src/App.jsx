import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { initDb } from './db';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerDetail from './pages/CustomerDetail';
import Summary from './pages/Summary';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initDb().then(() => {
      const auth = localStorage.getItem('milkledger_auth');
      if (auth === 'true') setIsAuthenticated(true);
      setIsLoading(false);
    });
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

  const handleLogout = () => {
    localStorage.removeItem('milkledger_auth');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login setAuth={setIsAuthenticated} /> : <Navigate to="/" />} />
        <Route path="/" element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />} />
        <Route path="/customer/:id" element={isAuthenticated ? <CustomerDetail /> : <Navigate to="/login" />} />
        <Route path="/summary" element={isAuthenticated ? <Summary /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
