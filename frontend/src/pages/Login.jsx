import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import logo from "../assets/clglogo.jpeg";
import { LogIn, Key, Mail, Shield, Users, GraduationCap, CheckCircle, Eye, EyeOff } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState(() => localStorage.getItem('remember_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remember_me') === 'true');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();

      if (response.ok) {
        // Handle remember me local storage storage
        if (rememberMe) {
          localStorage.setItem('remember_email', email);
          localStorage.setItem('remember_me', 'true');
        } else {
          localStorage.removeItem('remember_email');
          localStorage.removeItem('remember_me');
        }

        // Save token and refresh token in local storage for auto-login
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }

        onLoginSuccess(data);
        navigate('/');
      } else {
        setError(data.message || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      setError('Connection refused. Is the backend server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role) => {
    if (role === 'faculty') {
      setEmail('chitra@college.edu');
      setPassword('password123');
    } else if (role === 'admin') {
      setEmail('admin@college.edu');
      setPassword('adminpassword');
    } else if (role === 'student') {
      setEmail('abishek@college.edu'); // student test email
      setPassword('student123');
    }
  };

  return (
    <div className="login-page-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      background: 'radial-gradient(circle at 10% 20%, var(--clr-primary-50, #f1f8f1) 0%, #e2e8f0 100%)'
    }}>
      <div className="glass-panel animate-fade-in login-card" style={{
        display: 'flex',
        width: '100%',
        maxWidth: '960px',
        minHeight: '600px',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)'
      }}>
        
        {/* Left Section: Branding & Info */}
        <div className="login-left-panel" style={{
          flex: 1,
          background: 'linear-gradient(135deg, var(--clr-primary-800, #1b5e20) 0%, var(--clr-primary-600, #2e7d32) 100%)',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#ffffff',
          position: 'relative'
        }}>
          {/* Decorative background shapes */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(255,255,255,0.06) 0%, transparent 40%), radial-gradient(circle at 85% 85%, rgba(255,255,255,0.06) 0%, transparent 40%)',
            pointerEvents: 'none'
          }} />

          {/* Logo & College name */}
          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <div style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              border: "2px solid rgba(255, 255, 255, 0.4)",
              overflow: "hidden",
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
            }}>
              <img
                src={logo}
                alt="College Logo"
                style={{
                  width: "90px",
                  height: "90px",
                  borderRadius: "50%",
                  objectFit: "cover"
                }}
              />
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '800',
              color: '#ffffff',
              letterSpacing: '0.04em',
              lineHeight: 1.3,
              marginBottom: '4px',
              fontFamily: 'var(--font-title)'
            }}>
              SHREE VENKATESHWARA
            </h1>
            <p style={{
              fontSize: '12px',
              color: 'var(--clr-primary-100, #e8f5e9)',
              fontWeight: '700',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '20px'
            }}>
              Hi-Tech Engineering College
            </p>
            
            <div style={{
              height: '3px',
              width: '60px',
              backgroundColor: 'var(--clr-primary-300, #66bb6a)',
              margin: '0 auto 20px',
              borderRadius: '2px'
            }} />

            <h2 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              Enterprise Attendance ERP
            </h2>
            <p style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.75)',
              marginTop: '4px'
            }}>
              Accurate tracking, analytics & reporting
            </p>
          </div>

          {/* Features checkmarks */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            marginTop: '20px',
            zIndex: 1
          }}>
            {[
              { text: 'Role-Based Authentication', desc: 'Secure login for Admin, HOD, Faculty & Students' },
              { text: 'Dynamic Master Calendar Roster', desc: 'Color-coded visual matrix with live stats' },
              { text: 'Professional Multi-Format Exports', desc: 'Beautifully generated corporate Excel, CSV & PDFs' }
            ].map((feat, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <CheckCircle size={18} style={{ color: 'var(--clr-primary-200, #a5d6a7)', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>{feat.text}</h4>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Copyright info */}
          <div style={{
            textAlign: 'center',
            fontSize: '10px',
            color: 'rgba(255,255,255,0.5)',
            marginTop: '30px',
            zIndex: 1
          }}>
            © {new Date().getFullYear()} SVHEC ERP. All Rights Reserved.
          </div>
        </div>

        {/* Right Section: Form */}
        <div className="login-right-panel" style={{
          flex: 1.1,
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{
              fontSize: '26px',
              fontWeight: '800',
              color: 'var(--clr-gray-900, #111827)',
              fontFamily: 'var(--font-title)',
              marginBottom: '6px'
            }}>
              Welcome to ERP
            </h2>
            <p style={{ color: 'var(--clr-gray-500, #6b7280)', fontSize: '13px' }}>
              Sign in to manage classes, attendance & reports
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FEE2E2',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--clr-gray-700, #374151)',
                marginBottom: '6px'
              }}>
                Institutional Email / Username
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter institutional email" 
                  className="input-field" 
                  style={{ paddingLeft: '44px', width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
                  required
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--clr-gray-700, #374151)'
                }}>
                  Password
                </label>
                <span 
                  onClick={() => setError('Please contact Admin to reset password.')}
                  style={{ fontSize: '12px', color: 'var(--clr-primary-700, #256427)', fontWeight: '600', cursor: 'pointer' }}
                >
                  Forgot Password?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter account password" 
                  className="input-field" 
                  style={{ paddingLeft: '44px', paddingRight: '40px', width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

           
            {/* <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer', width: '15px', height: '15px' }}
              />
              <label htmlFor="rememberMe" style={{ fontSize: '13px', color: 'var(--clr-gray-600, #4b5563)', cursor: 'pointer', userSelect: 'none' }}>
                Remember me on this device
              </label>
            </div> */}

            <button 
              type="submit" 
              className="btn btn-primary btn-block" 
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '6px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '46px',
                borderRadius: '10px'
              }}
              disabled={loading}
            >
              <LogIn size={18} />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Quick select logins */}
          <div style={{
            marginTop: '28px',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '20px'
          }}>
            <p style={{
              textAlign: 'center',
              fontSize: '10px',
              fontWeight: '700',
              color: 'var(--clr-gray-400, #94a3b8)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '10px'
            }}>
              Quick Demo Roster Logins
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={() => handleQuickLogin('faculty')}
                className="btn btn-secondary" 
                style={{ flex: '1 1 30%', fontSize: '11px', height: '36px' }}
              >
                <Users size={12} />
                <span>Faculty</span>
              </button>
              <button 
                type="button" 
                onClick={() => handleQuickLogin('admin')}
                className="btn btn-secondary" 
                style={{ flex: '1 1 30%', fontSize: '11px', height: '36px' }}
              >
                <Shield size={12} />
                <span>Admin</span>
              </button>
              {/* <button 
                type="button" 
                onClick={() => handleQuickLogin('student')}
                className="btn btn-secondary" 
                style={{ flex: '1 1 30%', fontSize: '11px', height: '36px' }}
              >
                <GraduationCap size={12} />
                <span>Student</span>
              </button> */}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
