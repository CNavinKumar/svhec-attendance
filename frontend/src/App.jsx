import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MockProvider } from './context/MockContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AttendancePage from './pages/AttendancePage';
import ConfirmationPage from './pages/ConfirmationPage';
import AdminPanel from './pages/AdminPanel';
import MasterCalendar from './pages/MasterCalendar';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import { API_BASE } from './config';

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const storedUser = localStorage.getItem('user');
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (!storedUser) {
        setCheckingAuth(false);
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(storedUser);
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        setCheckingAuth(false);
        return;
      }

      if (!parsed?.token) {
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        setCheckingAuth(false);
        return;
      }

      // 1. Try to validate with server
      try {
        const res = await fetch(`${API_BASE}/api/auth/validate`, {
          headers: { 'Authorization': `Bearer ${parsed.token}` }
        });

        if (res.ok) {
          const freshUser = await res.json();
          const updatedUser = { ...freshUser, token: parsed.token };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } else if (res.status === 401 && storedRefreshToken) {
          // 2. Access token expired, try refresh token
          const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken })
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            
            // Fetch fresh details with new token
            const detailRes = await fetch(`${API_BASE}/api/auth/validate`, {
              headers: { 'Authorization': `Bearer ${refreshData.token}` }
            });

            if (detailRes.ok) {
              const freshUser = await detailRes.json();
              const updatedUser = { ...freshUser, token: refreshData.token };
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
              localStorage.setItem('refreshToken', refreshData.refreshToken);
            } else {
              handleLogout();
            }
          } else {
            handleLogout();
          }
        } else {
          handleLogout();
        }
      } catch (err) {
        // Network error — allow offline tolerance if token is still cached
        setUser(parsed);
      } finally {
        setCheckingAuth(false);
      }
    };

    validateSession();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    try {
      if (storedRefreshToken) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefreshToken })
        });
      }
    } catch (_) {}
    
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
  };

  if (checkingAuth) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f1f8f1',
        gap: '16px'
      }}>
        <div style={{
          width: '48px', height: '48px',
          border: '4px solid #e8f5e9',
          borderTopColor: '#2e7d32',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ color: '#2e7d32', fontWeight: '600', fontSize: '14px' }}>
          Restoring ERP Session...
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Admin access validation check helper
  const isAdmin = user && ['admin', 'superadmin', 'hod'].includes(user.role);

  return (
    <ErrorBoundary>
      <ToastProvider>
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
                    element={isAdmin ? <AdminPanel user={user} /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/admin/master-calendar"
                    element={isAdmin ? <MasterCalendar user={user} /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/admin/analytics"
                    element={isAdmin ? <AnalyticsDashboard user={user} /> : <Navigate to="/login" />}
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
            </div>
          </Router>
        </MockProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
