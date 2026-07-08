import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, ShieldCheck, RefreshCw, AlertCircle, ToggleLeft, ToggleRight, Unlock } from 'lucide-react';

const AdminPanel = ({ user }) => {
  const navigate = useNavigate();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Correction permission state
  const [grantDate, setGrantDate] = useState('2026-07-07');
  const [grantPeriod, setGrantPeriod] = useState(1);
  const [grantLoading, setGrantLoading] = useState(false);

  const fetchDays = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/schedule/all', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (!res.ok) throw new Error('Failed to load schedule days list.');
      const data = await res.json();
      setDays(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchDays();
  }, [user]);

  const handleToggleHoliday = async (dateStr, currentIsHoliday) => {
    setError('');
    setSuccess('');
    setLoading(true);

    const isHoliday = !currentIsHoliday;
    const description = isHoliday 
      ? prompt('Enter holiday name (e.g. Festival, Local Holiday):') || 'Holiday' 
      : 'Working Day';

    try {
      const response = await fetch('http://localhost:5000/api/schedule/holiday', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          date: dateStr,
          isHoliday,
          description
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message);
        await fetchDays(); // Reload data with recalculated values
      } else {
        setError(data.message || 'Failed to update holiday status.');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPermission = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGrantLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/attendance/grant-correction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          date: grantDate,
          period: Number(grantPeriod)
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || 'Correction permission granted successfully.');
      } else {
        setError(data.message || 'Failed to grant correction permission.');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setGrantLoading(false);
    }
  };

  if (loading && days.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading Admin Portal...</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 24px', animation: 'fadeIn 0.3s ease' }}>
      
      {/* Back button */}
      <button 
        onClick={() => navigate('/')} 
        className="btn-secondary" 
        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={26} style={{ color: 'var(--color-primary)' }} />
            Administrator Schedule Control Center
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Manage academic schedules, holidays, dynamic Day shifts, and override edit restrictions.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--color-success)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
        
        {/* Left Column: Academic Calendar Days with Recalculation shifts */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-primary)' }}>
            Calendar Dates & 10-Day Rotation Sequence
          </h3>
          <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day Number</th>
                  <th>Timetable Status</th>
                  <th style={{ textAlign: 'center' }}>Holiday Toggle</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.date} style={{ opacity: day.isHoliday ? 0.7 : 1 }}>
                    <td style={{ fontWeight: '600' }}>{day.date}</td>
                    <td>
                      {day.dayNumber ? (
                        <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Day {day.dayNumber}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      {day.isHoliday ? (
                        <span className="badge badge-holiday">{day.description}</span>
                      ) : (
                        <span className="badge badge-present">Working Day</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleToggleHoliday(day.date, day.isHoliday)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: day.isHoliday ? 'var(--color-danger)' : 'var(--color-success)' }}
                        title="Toggle Holiday status"
                      >
                        {day.isHoliday ? (
                          <ToggleRight size={32} />
                        ) : (
                          <ToggleLeft size={32} className="text-secondary" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Force Edit Override */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Unlock size={18} style={{ color: 'var(--color-warning)' }} />
              Grant Edit Override
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>
              Override the 15-minute grace period lock. Grants the assigned faculty permission to edit the attendance for a chosen date and period.
            </p>

            <form onSubmit={handleGrantPermission} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Target Date</label>
                <input 
                  type="date" 
                  value={grantDate}
                  onChange={(e) => setGrantDate(e.target.value)}
                  className="input-field" 
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Period Number</label>
                <select 
                  value={grantPeriod}
                  onChange={(e) => setGrantPeriod(Number(e.target.value))}
                  className="input-field"
                >
                  <option value={1}>Period 1 (09:05 AM - 09:55 AM)</option>
                  <option value={2}>Period 2 (09:55 AM - 10:45 AM)</option>
                  <option value={3}>Period 3 (11:00 AM - 11:50 AM)</option>
                  <option value={4}>Period 4 (11:50 AM - 12:40 PM)</option>
                  <option value={5}>Period 5 (01:40 PM - 02:30 PM)</option>
                  <option value={6}>Period 6 (02:30 PM - 03:20 PM)</option>
                  <option value={7}>Period 7 (03:35 PM - 04:25 PM)</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px', marginTop: '8px' }}
                disabled={grantLoading}
              >
                <span>{grantLoading ? 'Granting...' : 'Grant Edit Permission'}</span>
              </button>
            </form>
          </div>

          {/* Quick Guidance Box */}
          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
            <h4 style={{ fontSize: '13px', color: 'var(--color-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} />
              Holiday Sequence Rules
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Toggling a working day into a holiday removes its Day Number and shifts that Day Number to the next available working day. All future Day Numbers automatically increment and shift forward to prevent skipping index days.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;
