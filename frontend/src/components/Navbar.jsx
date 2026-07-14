import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MockContext } from '../context/MockContext';
import { API_BASE } from '../config';
import logo from "../assets/clglogo.jpeg";
import {
  LogOut, Sliders, Calendar, Clock, AlertCircle, RefreshCw,
  X, ShieldCheck, Menu, User, LayoutDashboard
} from 'lucide-react';

const Navbar = ({ user, onLogout }) => {
  const { mockDate, setMockDate, mockTime, setMockTime, isRealTime, useRealTime } = useContext(MockContext);
  const [dayInfo, setDayInfo] = useState(null);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const fetchDayInfo = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/schedule/today?date=${mockDate}`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (response.ok) setDayInfo(await response.json());
      } catch (err) { /* silent */ }
    };
    fetchDayInfo();
  }, [mockDate, user]);

  // Close mobile menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileMenuOpen]);

  if (!user) return null;

  const handleLogoutClick = () => {
    setMobileMenuOpen(false);
    onLogout();
    navigate('/login');
  };

  const getPeriodLabel = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    const t = h * 60 + m;
    if (t >= 545 && t <= 595) return 'Period 1';
    if (t > 595 && t <= 645) return 'Period 2';
    if (t > 645 && t < 660) return 'Break';
    if (t >= 660 && t <= 710) return 'Period 3';
    if (t > 710 && t <= 760) return 'Period 4';
    if (t > 760 && t < 820) return 'Lunch';
    if (t >= 820 && t <= 870) return 'Period 5';
    if (t > 870 && t <= 920) return 'Period 6';
    if (t > 920 && t < 935) return 'Break';
    if (t >= 935 && t <= 985) return 'Period 7';
    return 'Outside Hours';
  };

  return (
    <>
      <nav style={{
        height: '64px',
        background: 'var(--green-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 12px rgba(27,67,50,0.18)'
      }}>
        {/* Left: Brand + Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: '#ffffff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0
            }}>
              <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', lineHeight: 1 }}>SVHEC IT</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', marginTop: '1px' }}>Attendance Portal</div>
            </div>
          </div>

          {/* Day info chip — hidden on mobile */}
          {dayInfo && (
            <div className="nav-chip-hide-mobile" style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px', padding: '4px 12px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <Calendar size={13} color="rgba(255,255,255,0.8)" />
              <span style={{ fontSize: '12px', fontWeight: '600', color: dayInfo.isHoliday ? '#FCD34D' : '#A7F3D0' }}>
                {dayInfo.description}
              </span>
            </div>
          )}

          {/* Time chip — hidden on mobile */}
          <div className="nav-chip-hide-mobile" style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px', padding: '4px 12px',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Clock size={13} color="rgba(255,255,255,0.8)" />
            <span style={{ fontSize: '12px', fontWeight: '600', color: isRealTime ? '#A7F3D0' : '#FCD34D' }}>
              {isRealTime ? '● Live' : 'Mock'}: {mockTime}
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>
              · {getPeriodLabel(mockTime)}
            </span>
          </div>
        </div>

        {/* Right: Desktop actions + Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

          {/* Desktop-only actions */}
          <div className="nav-desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user.role === 'admin' && (
              <button
                className="btn-secondary"
                style={{ padding: '6px 14px', fontSize: '12px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}
                onClick={() => navigate('/admin')}
              >
                Admin Panel
              </button>
            )}
            <div className="nav-user-info" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{user.name}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                {user.role === 'admin' ? 'Administrator' : `${user.department} Faculty`}
              </div>
            </div>
            <button
              onClick={() => setShowDemoPanel(!showDemoPanel)}
              style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#fff', display: 'flex'
              }}
              title="Simulation Controls"
            >
              <Sliders size={16} />
            </button>
            <button
              onClick={handleLogoutClick}
              style={{
                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: '#FCA5A5',
                fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div ref={drawerRef} className={`nav-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        {/* User info */}
        <div style={{ padding: '12px 20px 8px', borderBottom: '1px solid rgba(255,255,255,0.12)', marginBottom: '6px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{user.name}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
            {user.role === 'admin' ? 'Administrator' : `${user.department} Faculty`}
          </div>
          {/* Time info row */}
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Clock size={12} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: '11px', color: isRealTime ? '#A7F3D0' : '#FCD34D', fontWeight: '600' }}>
              {isRealTime ? '● Live' : 'Mock'}: {mockTime} · {getPeriodLabel(mockTime)}
            </span>
          </div>
          {dayInfo && (
            <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Calendar size={12} color="rgba(255,255,255,0.7)" />
              <span style={{ fontSize: '11px', color: dayInfo.isHoliday ? '#FCD34D' : '#A7F3D0', fontWeight: '600' }}>
                {dayInfo.description}
              </span>
            </div>
          )}
        </div>

        {/* Dashboard link */}
        <button className="nav-drawer-item" onClick={() => { navigate('/'); setMobileMenuOpen(false); }}>
          <LayoutDashboard size={16} /> Dashboard
        </button>

        {/* Admin Panel */}
        {user.role === 'admin' && (
          <button className="nav-drawer-item" onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }}>
            <ShieldCheck size={16} /> Admin Panel
          </button>
        )}

        {/* Simulation Controls */}
        <button className="nav-drawer-item" onClick={() => { setShowDemoPanel(true); setMobileMenuOpen(false); }}>
          <Sliders size={16} /> Simulation Controls
        </button>

        <div className="nav-drawer-divider" />

        {/* Logout */}
        <button className="nav-drawer-item danger" onClick={handleLogoutClick}>
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Demo Panel Drawer (Desktop) */}
      {showDemoPanel && (
        <div style={{
          position: 'fixed',
          top: '72px', right: '16px',
          width: '300px',
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          zIndex: 200,
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={15} color="var(--green-primary)" />
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)' }}>Simulation Controls</span>
            </div>
            <button onClick={() => setShowDemoPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Mock Calendar Date
              </label>
              <input
                type="date"
                value={mockDate}
                onChange={(e) => setMockDate(e.target.value)}
                className="input-field"
                style={{ fontSize: '13px' }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '3px' }}>
                Seeded: July 2 – Aug 31, 2026
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Mock Time of Day
              </label>
              <select
                value={mockTime}
                onChange={(e) => setMockTime(e.target.value)}
                className="input-field"
                style={{ fontSize: '13px' }}
              >
                <option value="09:15">09:15 AM — Period 1 Active</option>
                <option value="10:00">10:00 AM — Period 2 Active</option>
                <option value="10:05">10:05 AM — P1 Grace Period</option>
                <option value="10:15">10:15 AM — P1 Locked</option>
                <option value="10:50">10:50 AM — Short Break</option>
                <option value="11:15">11:15 AM — Period 3 Active</option>
                <option value="12:00">12:00 PM — Period 4 Active</option>
                <option value="13:00">01:00 PM — Lunch Break</option>
                <option value="14:00">02:00 PM — Period 5 Active</option>
                <option value="15:00">03:00 PM — Period 6 Active</option>
                <option value="16:00">04:00 PM — Period 7 Active</option>
              </select>
            </div>

            <div style={{ background: 'var(--green-mist)', borderRadius: '8px', padding: '10px', display: 'flex', gap: '8px' }}>
              <AlertCircle size={14} color="var(--green-primary)" style={{ flexShrink: 0, marginTop: '1px' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-medium)', lineHeight: '1.5' }}>
                Adjust to test period locks, holiday shifts, and correction windows.
              </span>
            </div>

            <button
              onClick={useRealTime}
              className="btn-secondary"
              style={{ width: '100%', fontSize: '13px', color: 'var(--color-success)', borderColor: '#6EE7B7', gap: '6px' }}
            >
              <RefreshCw size={13} />
              Use Real Date & Time
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
