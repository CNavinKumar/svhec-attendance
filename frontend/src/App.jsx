import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MockProvider } from './context/MockContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AttendancePage from './pages/AttendancePage';
import ConfirmationPage from './pages/ConfirmationPage';
import AdminPanel from './pages/AdminPanel';

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setCheckingAuth(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0b0f19', color: '#94a3b8' }}>
        <span>Initializing Portal Security...</span>
      </div>
    );
  }

  return (
    <MockProvider>
      <Router>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {user && <Navbar user={user} onLogout={handleLogout} />}
          <main style={{ flex: '1 0 auto' }}>
            <Routes>
              {/* Public route */}
              <Route 
                path="/login" 
                element={!user ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} 
              />

              {/* Protected routes */}
              <Route 
                path="/" 
                element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/attendance/:dayNumber/:period/:subject" 
                element={user ? <AttendancePage user={user} /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/confirmation/:dayNumber/:period" 
                element={user ? <ConfirmationPage user={user} /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/admin" 
                element={user && user.role === 'admin' ? <AdminPanel user={user} /> : <Navigate to="/login" />} 
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </MockProvider>
  );
}

export default App;
