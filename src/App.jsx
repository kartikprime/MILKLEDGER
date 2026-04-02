import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { initDb } from './db';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerDetail from './pages/CustomerDetail';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initDb().then(() => {
      const auth = localStorage.getItem('milkledger_auth');
      if (auth === 'true') {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login setAuth={setIsAuthenticated} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={isAuthenticated ? <Dashboard onLogout={() => {
            localStorage.removeItem('milkledger_auth');
            setIsAuthenticated(false);
          }} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/customer/:id" 
          element={isAuthenticated ? <CustomerDetail /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
