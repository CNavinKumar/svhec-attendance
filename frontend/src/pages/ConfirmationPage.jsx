import React, { useContext, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MockContext } from '../context/MockContext';
import { API_BASE } from '../config';
import { ArrowLeft, CheckCircle2, AlertCircle, Edit2, Save, Users, UserCheck, UserX } from 'lucide-react';

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
      const response = await fetch(`${API_BASE}/api/attendance/status?date=${mockDate}&period=${period}&timetableDay=${dayNumber}&mockTime=${mockTime}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load attendance record.');
      const data = await response.json();
      
      // Verify assignment for view/edit (only assigned teacher or admin is allowed)
      if (user.role !== 'admin' && data.teacherId && data.teacherId !== user.teacherId) {
        setError('Unauthorized: You do not have permission to access this period.');
        setLoading(false);
        return;
      }

      setAttendanceData(data);

      if (data.marked) {
        // Initialize edit records with current states
        setEditRecords(data.records.map(r => ({
          studentRegisterNumber: r.studentRegisterNumber,
          status: r.status,
          name: r.name,
          department: r.department,
          year: r.year,
          section: r.section
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

    // Count states
    const presentCount = editRecords.filter(r => r.status === 'Present').length;
    const absentCount = editRecords.filter(r => r.status === 'Absent').length;
    const odCount = editRecords.filter(r => r.status === 'OD').length;

    const confirmMsg = `Confirm Attendance Changes:\n\nPresent: ${presentCount}\nAbsent: ${absentCount}\nOn Duty (OD): ${odCount}\n\nAre you sure you want to save these changes?`;
    if (!window.confirm(confirmMsg)) {
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/attendance/edit`, {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', backgroundColor: 'var(--bg-page)' }}>
        <div style={{ color: 'var(--green-primary)', fontWeight: '600' }}>Loading summary details...</div>
      </div>
    );
  }

  if (!attendanceData?.marked) return null;

  const { summary, isAllowedToEdit } = attendanceData;
  const absentees = attendanceData.records.filter(r => r.status === 'Absent');
  const odStudents = attendanceData.records.filter(r => r.status === 'OD');
  const lateStudents = attendanceData.records.filter(r => r.status === 'Late');

  // Calculate percentages for overview bar
  const totalCount = summary.total || 1;
  const presentPct = Math.round((summary.present / totalCount) * 100);
  const absentPct = Math.round((summary.absent / totalCount) * 100);
  const odPct = Math.round((summary.od / totalCount) * 100);
  const latePct = Math.round(((summary.late || 0) / totalCount) * 100);

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', minHeight: 'calc(100vh - 64px)', padding: '24px 0' }}>
      <div className="container">
        
        {/* Back button */}
        <button 
          onClick={() => navigate('/')} 
          className="btn-secondary" 
          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', height: '36px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main banner */}
          <div className="glass-panel accent-left animate-fade-in" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: 'var(--white)' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', minWidth: '260px', flex: '1' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
              <div>
                <h2 style={{ fontSize: '18px', color: 'var(--text-dark)', fontWeight: '800', margin: 0 }}>Attendance Submitted Successfully</h2>
                <p style={{ color: 'var(--text-medium)', fontSize: '12px', marginTop: '2px', margin: 0 }}>
                  The records have been securely stored in the academic register.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {isAllowedToEdit ? (
                <>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {attendanceData.adminAllowed ? 'Admin Override Active' : 'Grace Window'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-warning)', fontFamily: 'monospace' }}>
                      {attendanceData.adminAllowed ? 'Unlimited' : formatTimer(graceSecondsLeft)}
                    </div>
                  </div>
                  {!isEditing && (
                    <button 
                      onClick={() => setIsEditing(true)} 
                      className="btn-primary" 
                      style={{ padding: '8px 16px', fontSize: '12px', height: '36px', gap: '6px' }}
                    >
                      <Edit2 size={12} />
                      <span>Edit Attendance</span>
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px', background: 'var(--green-mist)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <AlertCircle size={14} />
                  <span>Locked (Grace period expired)</span>
                </div>
              )}
            </div>
          </div>

          {/* Submission Receipt details */}
          {!isEditing && (
            <div className="card" style={{ borderLeft: '4px solid var(--clr-success)' }}>
              <div className="card-header" style={{ padding: '10px 16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--clr-gray-500)', letterSpacing: '0.04em' }}>
                  Submission Receipt
                </h3>
              </div>
              <div className="card-body" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Class</label>
                  <div style={{ fontWeight: '700', color: 'var(--clr-gray-800)', fontSize: '14px' }}>
                    {attendanceData.records[0]?.year ? `${['I','II','III','IV'][attendanceData.records[0].year - 1]} IT A` : 'III IT A'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Subject</label>
                  <div style={{ fontWeight: '700', color: 'var(--clr-gray-800)', fontSize: '14px' }}>{attendanceData.subject}</div>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Period</label>
                  <div style={{ fontWeight: '700', color: 'var(--clr-gray-800)', fontSize: '14px' }}>{period} Hour</div>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Submitted At</label>
                  <div style={{ fontWeight: '700', color: 'var(--clr-gray-800)', fontSize: '14px' }}>{mockTime || '10:18 AM'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Submitted By</label>
                  <div style={{ fontWeight: '700', color: 'var(--clr-gray-800)', fontSize: '14px' }}>
                    {user.teacherId === attendanceData.teacherId ? user.name : `Instructor (${attendanceData.teacherId})`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {/* Stat Numbers */}
          {!isEditing && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Students</span>
                    <h3 style={{ fontSize: '26px', color: 'var(--text-dark)', marginTop: '4px' }}>{summary.total}</h3>
                  </div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--green-mist)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-primary)' }}>
                    <Users size={20} />
                  </div>
                </div>
              </div>
              
              <div className="stat-card" style={{ '--green-primary': 'var(--color-success)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Present</span>
                    <h3 style={{ fontSize: '26px', color: 'var(--color-success)', marginTop: '4px' }}>{summary.present}</h3>
                  </div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
                    <UserCheck size={20} />
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{ '--green-primary': 'var(--color-danger)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Absent</span>
                    <h3 style={{ fontSize: '26px', color: 'var(--color-danger)', marginTop: '4px' }}>{summary.absent}</h3>
                  </div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }}>
                    <UserX size={20} />
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{ '--green-primary': 'var(--color-warning)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>On Duty</span>
                    <h3 style={{ fontSize: '26px', color: 'var(--color-warning)', marginTop: '4px' }}>{summary.od}</h3>
                  </div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)' }}>
                    <AlertCircle size={20} />
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{ '--green-primary': 'var(--clr-warning)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Late</span>
                    <h3 style={{ fontSize: '26px', color: 'var(--clr-warning)', marginTop: '4px' }}>{summary.late || 0}</h3>
                  </div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-warning)' }}>
                    <Clock size={20} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Content: Edit Form OR Details View */}
          {isEditing ? (
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'var(--white)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '15px', color: 'var(--text-dark)' }}>Edit Attendance Records</h3>
                <span className="badge badge-holiday">Editing Active</span>
              </div>

              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>S.No</th>
                      <th style={{ width: '160px' }}>Register Number</th>
                      <th>Student Name</th>
                      <th style={{ width: '280px', textAlign: 'center' }}>Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editRecords.map((rec, index) => (
                      <tr key={rec.studentRegisterNumber}>
                        <td>{index + 1}</td>
                        <td style={{ fontWeight: '700', color: 'var(--text-medium)' }}>{rec.studentRegisterNumber}</td>
                        <td>
                          <div>{rec.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--clr-gray-500)', display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <span>Dept: {rec.department}</span>
                            <span style={{ color: 'var(--clr-gray-300)' }}>|</span>
                            <span>Year: {rec.year}</span>
                            <span style={{ color: 'var(--clr-gray-300)' }}>|</span>
                            <span>Section: {rec.section}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
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
                                On Duty
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => { setIsEditing(false); fetchAttendanceStatus(); }} 
                  className="btn-secondary"
                  style={{ height: '38px' }}
                >
                  Discard Edits
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveChanges} 
                  className="btn-primary"
                  disabled={submitting}
                  style={{ height: '38px', gap: '6px' }}
                >
                  <Save size={16} />
                  <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Progress Overview Bar */}
               <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'var(--white)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-dark)', marginBottom: '12px' }}>Attendance Distribution</h3>
                <div style={{ display: 'flex', height: '24px', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'var(--bg-page)', marginBottom: '16px' }}>
                  {summary.present > 0 && (
                    <div style={{ width: `${presentPct}%`, backgroundColor: '#065F46', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} title="Present">
                      {presentPct}%
                    </div>
                  )}
                  {summary.absent > 0 && (
                    <div style={{ width: `${absentPct}%`, backgroundColor: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} title="Absent">
                      {absentPct}%
                    </div>
                  )}
                  {summary.od > 0 && (
                    <div style={{ width: `${odPct}%`, backgroundColor: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} title="On Duty">
                      {odPct}%
                    </div>
                  )}
                  {(summary.late || 0) > 0 && (
                    <div style={{ width: `${latePct}%`, backgroundColor: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} title="Late">
                      {latePct}%
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#065F46' }}></span>
                    <span>Present ({summary.present})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#991B1B' }}></span>
                    <span>Absent ({summary.absent})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#7C3AED' }}></span>
                    <span>On Duty ({summary.od})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#D97706' }}></span>
                    <span>Late ({summary.late || 0})</span>
                  </div>
                </div>
              </div>

              {/* Lists Section */}
              <div className="grid-2">
                {/* Absentees List Card */}
                <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'var(--white)' }}>
                  <h3 style={{ fontSize: '14px', color: 'var(--color-danger)', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px' }}>
                    Absentees List ({absentees.length})
                  </h3>
                  {absentees.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {absentees.map((item, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', background: '#FEE2E2', borderRadius: '6px', border: '1px solid #FCA5A5', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: '600', fontSize: '13px', color: '#991B1B' }}>{item.name}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#B91C1C' }}>{item.studentRegisterNumber}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#991B1B', opacity: 0.8, display: 'flex', gap: '8px' }}>
                            <span>Dept: {item.department}</span>
                            <span>•</span>
                            <span>Year: {item.year}</span>
                            <span>•</span>
                            <span>Section: {item.section}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>
                      No students are absent for this class.
                    </div>
                  )}
                </div>

                {/* OnDuty (OD) List Card */}
                <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'var(--white)' }}>
                  <h3 style={{ fontSize: '14px', color: 'var(--color-warning)', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px' }}>
                    On Duty (OD) List ({odStudents.length})
                  </h3>
                  {odStudents.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {odStudents.map((item, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', background: '#FEF3C7', borderRadius: '6px', border: '1px solid #FCD34D', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: '600', fontSize: '13px', color: '#92400E' }}>{item.name}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#B45309' }}>{item.studentRegisterNumber}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#92400E', opacity: 0.8, display: 'flex', gap: '8px' }}>
                            <span>Dept: {item.department}</span>
                            <span>•</span>
                            <span>Year: {item.year}</span>
                            <span>•</span>
                            <span>Section: {item.section}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>
                      No students are on duty (OD).
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;
