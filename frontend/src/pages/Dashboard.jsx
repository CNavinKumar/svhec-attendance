import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MockContext } from '../context/MockContext';
import { Calendar, User, BookOpen, Clock, CheckCircle2, Lock, AlertTriangle, Eye } from 'lucide-react';

const Dashboard = ({ user }) => {
  const { mockDate, mockTime } = useContext(MockContext);
  const [dayInfo, setDayInfo] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [periodStatuses, setPeriodStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch today's day number & holiday status
  useEffect(() => {
    const fetchDayData = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`http://localhost:5000/api/schedule/today?date=${mockDate}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch schedule day info.');
        const dayData = await response.json();
        setDayInfo(dayData);

        if (dayData.isHoliday || !dayData.dayNumber) {
          setSchedule([]);
          setLoading(false);
          return;
        }

        // Fetch timetable for that day number
        const timetableRes = await fetch(`http://localhost:5000/api/timetable/my-schedule/${dayData.dayNumber}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        if (!timetableRes.ok) throw new Error('Failed to fetch timetable.');
        const timetableData = await timetableRes.json();
        setSchedule(timetableData.schedule);

        // Fetch status (marked/unmarked) for all 7 periods
        const statusMap = {};
        for (let period of timetableData.schedule) {
          const statusRes = await fetch(`http://localhost:5000/api/attendance/status?date=${mockDate}&period=${period.period}&timetableDay=${dayData.dayNumber}&mockTime=${mockTime}`, {
            headers: {
              'Authorization': `Bearer ${user.token}`
            }
          });
          if (statusRes.ok) {
            statusMap[period.period] = await statusRes.json();
          }
        }
        setPeriodStatuses(statusMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDayData();
  }, [mockDate, mockTime, user]);

  const handleMarkClick = (periodNumber, subjectAcronym) => {
    navigate(`/attendance/${dayInfo.dayNumber}/${periodNumber}/${subjectAcronym}`);
  };

  const handleViewClick = (periodNumber) => {
    navigate(`/confirmation/${dayInfo.dayNumber}/${periodNumber}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading Academic Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 24px', animation: 'fadeIn 0.3s ease' }}>
      
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
        
        {/* Left Column: Teacher Info Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                <User size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{user.name}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {user.teacherId}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Department</span>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>Information Technology</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Subjects</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {user.assignedSubjects.length > 0 ? (
                    user.assignedSubjects.map((sub, i) => (
                      <span key={i} className="badge badge-present" style={{ fontSize: '11px' }}>{sub}</span>
                    ))
                  ) : (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>None (Admin user)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
            <h4 style={{ fontSize: '13px', color: 'var(--color-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} />
              Academic Rule reminder
            </h4>
            <ul style={{ listStyleType: 'disc', paddingLeft: '16px', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Attendance can only be submitted during the active period window.</li>
              <li>Teacher has a 15-minute grace period after class to make corrections.</li>
              <li>Lockouts will trigger automatically after the grace period.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Timetable Schedule */}
        <div>
          {dayInfo?.isHoliday ? (
            <div className="glass-panel flex-center animate-fade-in" style={{ flexDirection: 'column', padding: '60px 40px', gap: '20px', borderStyle: 'dashed' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: '#818cf8' }}>
                <Calendar size={32} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Holiday Schedule</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px' }}>
                  Today is marked as a holiday: <strong>{dayInfo.description}</strong>. Timetable schedule is inactive, and no attendance can be recorded.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '22px' }}>Today's Periods Timetable</h2>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Active Schedule: <strong style={{ color: 'var(--color-primary)' }}>{dayInfo?.description}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {schedule.map((slot) => {
                  const statusInfo = periodStatuses[slot.period] || {};
                  const isAssignedToMe = user.role === 'admin' || slot.teacherId === user.teacherId;
                  const isFree = slot.subjectAcronym === 'FREE';
                  
                  // Marking open state based on API response
                  const markingOpen = statusInfo.markingOpen;
                  const isMarked = statusInfo.marked;
                  const canEdit = statusInfo.isAllowedToEdit;

                  let borderClass = '';
                  let glowBadge = null;

                  if (markingOpen && isAssignedToMe && !isMarked) {
                    borderClass = 'active-glow';
                    glowBadge = (
                      <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: 'var(--color-secondary)', border: '1px solid rgba(168, 85, 247, 0.4)', animation: 'pulse-glow 1.5s infinite' }}>
                        ● Active Period
                      </span>
                    );
                  }

                  return (
                    <div 
                      key={slot.period} 
                      className={`glass-panel ${borderClass}`} 
                      style={{ padding: '20px', display: 'grid', gridTemplateColumns: '120px 1fr auto', alignItems: 'center', gap: '20px' }}
                    >
                      {/* Period timing and number */}
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>PERIOD {slot.period}</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>{slot.startTime} - {slot.endTime}</div>
                      </div>

                      {/* Subject Acronym and Name */}
                      <div>
                        {isFree ? (
                          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '15px' }}>Free Period</div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '16px', fontWeight: '700', color: isAssignedToMe ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
                                {slot.subjectAcronym}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Classroom: {slot.classroom}</span>
                              {glowBadge}
                              {!isAssignedToMe && (
                                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', fontSize: '10px' }}>
                                  Other Faculty
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{slot.subjectName}</div>
                          </>
                        )}
                      </div>

                      {/* Action buttons or statuses */}
                      <div>
                        {isFree ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>
                        ) : isMarked ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <span className="badge badge-present" style={{ gap: '4px' }}>
                                <CheckCircle2 size={12} />
                                Marked
                              </span>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                P: {statusInfo.summary?.present} | A: {statusInfo.summary?.absent} | OD: {statusInfo.summary?.od}
                              </div>
                            </div>
                            
                            {canEdit ? (
                              <button 
                                onClick={() => handleViewClick(slot.period)}
                                className="btn-primary" 
                                style={{ padding: '8px 16px', fontSize: '12px' }}
                              >
                                Edit
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleViewClick(slot.period)}
                                className="btn-secondary" 
                                style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={12} />
                                View
                              </button>
                            )}
                          </div>
                        ) : isAssignedToMe ? (
                          markingOpen ? (
                            <button 
                              onClick={() => handleMarkClick(slot.period, slot.subjectAcronym)}
                              className="btn-primary" 
                              style={{ padding: '10px 20px', fontSize: '13px' }}
                            >
                              Mark Attendance
                            </button>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                              <Lock size={14} />
                              <span>Closed / Locked</span>
                            </div>
                          )
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                            <Lock size={14} />
                            <span>View Only</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
