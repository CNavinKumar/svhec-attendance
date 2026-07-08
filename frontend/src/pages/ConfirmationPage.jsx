import React, { useContext, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MockContext } from '../context/MockContext';
import { ArrowLeft, CheckCircle2, AlertCircle, Edit2, Save, Trash2 } from 'lucide-react';

const ConfirmationPage = ({ user }) => {
  const { dayNumber, period } = useParams();
  const { mockDate, mockTime } = useContext(MockContext);
  const navigate = useNavigate();

  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editRecords, setEditRecords] = useState([]); // Array of { studentRegisterNumber, status }
  const [submitting, setSubmitting] = useState(false);
  
  // Timer for grace period countdown
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(0);
  const graceTimerRef = useRef(null);

  const fetchAttendanceStatus = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/attendance/status?date=${mockDate}&period=${period}&timetableDay=${dayNumber}&mockTime=${mockTime}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load attendance record.');
      const data = await response.json();
      
      setAttendanceData(data);

      if (data.marked) {
        // Initialize edit records with current states
        setEditRecords(data.records.map(r => ({
          studentRegisterNumber: r.studentRegisterNumber,
          status: r.status,
          name: r.name
        })));
      } else {
        // If not marked, go back
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceStatus();
  }, [dayNumber, period, mockDate, user]);

  // Grace Period timer ticker
  useEffect(() => {
    if (loading || !attendanceData?.marked) return;

    // Period timings mappings
    const periodEndTimes = {
      1: 9*60 + 55,
      2: 10*60 + 45,
      3: 11*60 + 50,
      4: 12*60 + 40,
      5: 14*60 + 30,
      6: 15*60 + 20,
      7: 16*60 + 25
    };

    const endTimeVal = periodEndTimes[Number(period)];
    if (!endTimeVal) return;

    const [hours, minutes] = mockTime.split(':').map(Number);
    const mockTimeVal = hours * 60 + minutes;
    const graceEndVal = endTimeVal + 15; // 15 minutes grace period

    const diffMinutes = graceEndVal - mockTimeVal;

    if (diffMinutes <= 0 && !attendanceData.adminAllowed) {
      setGraceSecondsLeft(0);
      return;
    }

    setGraceSecondsLeft(diffMinutes * 60);

    if (graceTimerRef.current) clearInterval(graceTimerRef.current);
    graceTimerRef.current = setInterval(() => {
      setGraceSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(graceTimerRef.current);
          // Refetch to lock edits
          fetchAttendanceStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (graceTimerRef.current) clearInterval(graceTimerRef.current);
    };
  }, [loading, mockTime, period, attendanceData]);

  const handleEditStatusChange = (regNum, newStatus) => {
    setEditRecords(prev => 
      prev.map(rec => rec.studentRegisterNumber === regNum ? { ...rec, status: newStatus } : rec)
    );
  };

  const handleSaveChanges = async () => {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/attendance/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          date: mockDate,
          period: Number(period),
          records: editRecords,
          mockTime
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsEditing(false);
        await fetchAttendanceStatus(); // Refresh details
      } else {
        setError(data.message || 'Failed to save changes.');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (secs) => {
    if (secs <= 0) return 'Expired';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading summary details...</div>
      </div>
    );
  }

  if (!attendanceData?.marked) return null;

  const { summary, isAllowedToEdit } = attendanceData;
  const absentees = attendanceData.records.filter(r => r.status === 'Absent');
  const odStudents = attendanceData.records.filter(r => r.status === 'OD');

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

      {/* Alert / Grace period Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--color-success)', background: 'rgba(16, 185, 129, 0.02)' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <CheckCircle2 size={36} style={{ color: 'var(--color-success)' }} />
            <div>
              <h2 style={{ fontSize: '20px' }}>Attendance Record Active</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
                Day {dayNumber} • Period {period} ({attendanceData.periodLabel}) • Subject: <strong>{attendanceData.subject}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {isAllowedToEdit ? (
              <>
                <div style={{ textAlign: 'right', marginRight: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {attendanceData.adminAllowed ? 'Admin Override Active' : 'Grace Correction Time Left'}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-warning)', fontFamily: 'monospace' }}>
                    {attendanceData.adminAllowed ? 'Unlimited' : formatTimer(graceSecondsLeft)}
                  </div>
                </div>
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="btn-primary" 
                    style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', boxShadow: 'none', color: '#a5b4fc', gap: '6px' }}
                  >
                    <Edit2 size={14} />
                    <span>Edit Attendance</span>
                  </button>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <AlertCircle size={14} />
                <span>Correction Locked (Grace period expired)</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-danger)', padding: '16px', borderRadius: '12px' }}>
            {error}
          </div>
        )}

        {/* Dashboard summary numbers */}
        {!isEditing && (
          <div className="grid-cols-3">
            <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>TOTAL STUDENTS</div>
              <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px', color: 'var(--text-primary)' }}>{summary.total}</div>
            </div>
            <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', borderBottom: '3px solid var(--color-success)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PRESENT</div>
              <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px', color: 'var(--color-success)' }}>{summary.present}</div>
            </div>
            <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', borderBottom: '3px solid var(--color-danger)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ABSENT</div>
              <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px', color: 'var(--color-danger)' }}>{summary.absent}</div>
            </div>
          </div>
        )}

        {/* Dynamic Display: Show View details OR Inline Editing Form */}
        {isEditing ? (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px' }}>Edit Attendance Records</h3>
              <span className="badge badge-holiday">Editing Mode</span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>S.No</th>
                    <th style={{ width: '180px' }}>Register Number</th>
                    <th>Student Name</th>
                    <th style={{ width: '280px', textAlign: 'center' }}>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {editRecords.map((rec, index) => (
                    <tr key={rec.studentRegisterNumber}>
                      <td>{index + 1}</td>
                      <td style={{ fontWeight: '600' }}>{rec.studentRegisterNumber}</td>
                      <td>{rec.name}</td>
                      <td style={{ display: 'flex', justifyContent: 'center' }}>
                        <div className="attendance-toggle-group">
                          <button
                            type="button"
                            onClick={() => handleEditStatusChange(rec.studentRegisterNumber, 'Present')}
                            className={`attendance-toggle-btn ${rec.status === 'Present' ? 'active-Present' : ''}`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditStatusChange(rec.studentRegisterNumber, 'Absent')}
                            className={`attendance-toggle-btn ${rec.status === 'Absent' ? 'active-Absent' : ''}`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditStatusChange(rec.studentRegisterNumber, 'OD')}
                            className={`attendance-toggle-btn ${rec.status === 'OD' ? 'active-OD' : ''}`}
                          >
                            On Duty (OD)
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '16px' }}>
              <button 
                type="button" 
                onClick={() => { setIsEditing(false); fetchAttendanceStatus(); }} 
                className="btn-secondary"
              >
                Discard Edits
              </button>
              <button 
                type="button" 
                onClick={handleSaveChanges} 
                className="btn-primary"
                disabled={submitting}
              >
                <Save size={16} />
                <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid-cols-2">
            
            {/* Absentees List Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', color: 'var(--color-danger)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', marginBottom: '14px' }}>
                Absentees List ({absentees.length})
              </h3>
              {absentees.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {absentees.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(239, 68, 68, 0.03)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      <span style={{ fontWeight: '500' }}>{item.name}</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{item.studentRegisterNumber}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '12px 0' }}>
                  No students are absent for this class.
                </div>
              )}
            </div>

            {/* OnDuty (OD) List Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', color: 'var(--color-warning)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', marginBottom: '14px' }}>
                On Duty (OD) List ({odStudents.length})
              </h3>
              {odStudents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {odStudents.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(245, 158, 11, 0.03)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                      <span style={{ fontWeight: '500' }}>{item.name}</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{item.studentRegisterNumber}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '12px 0' }}>
                  No students are on duty (OD).
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default ConfirmationPage;
