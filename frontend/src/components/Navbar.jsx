import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MockContext } from '../context/MockContext';
import { LogOut, Sliders, Calendar, Clock, BookOpen, AlertCircle } from 'lucide-react';

const Navbar = ({ user, onLogout }) => {
  const { mockDate, setMockDate, mockTime, setMockTime } = useContext(MockContext);
  const [dayInfo, setDayInfo] = useState(null);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch Day info whenever mockDate changes
  useEffect(() => {
    if (!user) return;

    const fetchDayInfo = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/schedule/today?date=${mockDate}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setDayInfo(data);
        }
      } catch (err) {
        console.error('Error fetching day info:', err);
      }
    };

    fetchDayInfo();
  }, [mockDate, user]);

  if (!user) return null;

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  const getPeriodLabelByTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes >= 545 && totalMinutes <= 595) return 'Period 1 (09:05 AM - 09:55 AM)';
    if (totalMinutes > 595 && totalMinutes <= 645) return 'Period 2 (09:55 AM - 10:45 AM)';
    if (totalMinutes > 645 && totalMinutes < 660) return 'Short Break (10:45 AM - 11:00 AM)';
    if (totalMinutes >= 660 && totalMinutes <= 710) return 'Period 3 (11:00 AM - 11:50 AM)';
    if (totalMinutes > 710 && totalMinutes <= 760) return 'Period 4 (11:50 AM - 12:40 PM)';
    if (totalMinutes > 760 && totalMinutes < 820) return 'Lunch Break (12:40 PM - 01:40 PM)';
    if (totalMinutes >= 820 && totalMinutes <= 870) return 'Period 5 (01:40 PM - 02:30 PM)';
    if (totalMinutes > 870 && totalMinutes <= 920) return 'Period 6 (02:30 PM - 03:20 PM)';
    if (totalMinutes > 920 && totalMinutes < 935) return 'Short Break (03:20 PM - 03:30 PM)';
    if (totalMinutes >= 935 && totalMinutes <= 985) return 'Period 7 (03:35 PM - 04:25 PM)';
    
    return 'Outside College Hours';
  };

  return (
    <nav className="app-header glass-panel" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: '0', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <h1 style={{ fontSize: '20px', background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', cursor: 'pointer' }} onClick={() => navigate('/')}>
          SVHEC IT Attendance
        </h1>
        {dayInfo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <Calendar size={14} className="text-secondary" />
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
              {dayInfo.isHoliday ? (
                <span className="badge badge-holiday">{dayInfo.description}</span>
              ) : (
                <span style={{ color: '#818cf8' }}>{dayInfo.description}</span>
              )}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
          <Clock size={14} className="text-secondary" />
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
            Mock: <span style={{ color: '#a855f7', fontWeight: '600' }}>{mockTime}</span> ({getPeriodLabelByTime(mockTime)})
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user.role === 'admin' && (
          <button 
            className="btn-secondary" 
            style={{ padding: '8px 12px', fontSize: '13px' }}
            onClick={() => navigate('/admin')}
          >
            Admin Panel
          </button>
        )}
        
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: '600' }}>{user.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.role === 'admin' ? 'Admin' : `${user.department} Faculty`}</div>
        </div>

        <button 
          onClick={() => setShowDemoPanel(!showDemoPanel)} 
          className="btn-secondary" 
          style={{ padding: '8px', borderRadius: '8px', position: 'relative' }} 
          title="Demo Simulation Panel"
        >
          <Sliders size={18} />
        </button>

        <button 
          onClick={handleLogoutClick} 
          className="btn-primary" 
          style={{ padding: '8px 12px', fontSize: '13px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', boxShadow: 'none', color: '#f87171' }}
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>

      {/* Floating Demo Control Panel */}
      {showDemoPanel && (
        <div className="glass-panel" style={{ position: 'absolute', top: '75px', right: '24px', width: '320px', padding: '20px', zIndex: 1000, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
            <Sliders size={16} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: '15px' }}>Demo simulation controls</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Mock Calendar Date</label>
              <input 
                type="date" 
                value={mockDate} 
                onChange={(e) => setMockDate(e.target.value)} 
                className="input-field" 
                style={{ fontSize: '13px', padding: '8px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Seeded timetable runs July 2 – Aug 31, 2026.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Mock Time of Day</label>
              <select 
                value={mockTime} 
                onChange={(e) => setMockTime(e.target.value)} 
                className="input-field" 
                style={{ fontSize: '13px', padding: '8px' }}
              >
                <option value="09:15">09:15 AM (P1 Active: 09:05 - 09:55)</option>
                <option value="10:00">10:00 AM (P2 Active: 09:55 - 10:45)</option>
                <option value="10:05">10:05 AM (P1 Grace Period ends 10:10)</option>
                <option value="10:15">10:15 AM (P1 Locked; request correction)</option>
                <option value="10:50">10:50 AM (Break: 10:45 - 11:00)</option>
                <option value="11:15">11:15 AM (P3 Active: 11:00 - 11:50)</option>
                <option value="12:00">12:00 PM (P4 Active: 11:50 - 12:40)</option>
                <option value="13:00">01:00 PM (Lunch: 12:40 - 01:40)</option>
                <option value="14:00">02:00 PM (P5 Active: 01:40 - 02:30)</option>
                <option value="15:00">03:00 PM (P6 Active: 02:30 - 03:20)</option>
                <option value="16:00">04:00 PM (P7 Active: 03:35 - 04:25)</option>
              </select>
            </div>
            
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <AlertCircle size={14} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
                <span>Adjust mock dates/times to test restrictions, holiday shifts, and correction locks dynamically.</span>
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '8px', fontSize: '13px' }}
              onClick={() => setShowDemoPanel(false)}
            >
              Close Drawer
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
