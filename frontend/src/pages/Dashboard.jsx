import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { MockContext } from '../context/MockContext';
import { API_BASE } from '../config';
import { useToast } from '../context/ToastContext';
import DateTimeBanner from '../components/DateTimeBanner';
import StatusBadge from '../components/StatusBadge';
import { 
  Calendar, BookOpen, Clock, Lock, Eye, Award, CheckSquare, 
  GraduationCap, ClipboardCheck, Play, Edit3, AlertTriangle, Bell
} from 'lucide-react';

const Dashboard = ({ user }) => {
  const { mockDate, mockTime } = useContext(MockContext);
  const toast = useToast();
  const [dayInfo, setDayInfo] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [periodStatuses, setPeriodStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const isInitialLoadRef = useRef(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // ERP Dashboard alerts feed
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'warning', msg: '2 students in DBMS fell below 75% attendance criteria.' },
    { id: 2, type: 'info', msg: 'Period 3 attendance logged successfully.' }
  ]);

  // Reset initial load status when date changes
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [mockDate]);

  // Fetch today's day number & holiday status
  const fetchDayData = async () => {
    try {
      if (isInitialLoadRef.current) {
        setLoading(true);
      }
      setError('');
      
      const response = await fetch(`${API_BASE}/api/schedule/today?date=${mockDate}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
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
      const timetableRes = await fetch(`${API_BASE}/api/timetable/my-schedule/${dayData.dayNumber}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!timetableRes.ok) throw new Error('Failed to fetch timetable.');
      const timetableData = await timetableRes.json();
      
      setSchedule(timetableData.schedule);

      // Parallel status checks
      const statusPromises = timetableData.schedule.map(async (period) => {
        try {
          const statusRes = await fetch(`${API_BASE}/api/attendance/status?date=${mockDate}&period=${period.period}&timetableDay=${dayData.dayNumber}&mockTime=${mockTime}`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
          });
          if (statusRes.ok) {
            const info = await statusRes.json();
            return { period: period.period, info };
          }
        } catch (err) {
          console.error(`Status check failed for period ${period.period}`, err);
        }
        return { period: period.period, info: { marked: false, markingOpen: false } };
      });

      const statusResults = await Promise.all(statusPromises);
      const statusMap = {};
      statusResults.forEach(res => {
        statusMap[res.period] = res.info;
      });
      setPeriodStatuses(statusMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  };

  // Socket IO for live sync
  useEffect(() => {
    fetchDayData();

    const socket = io(API_BASE);
    socket.emit('join_room', 'attendance_updates');

    socket.on('attendance_updated', (data) => {
      if (data.date === mockDate) {
        toast.info(`Real-time update: Hour ${data.period} attendance submitted!`);
        fetchDayData();
        
        // Push alert to feed
        setAlerts(prev => [
          { id: Date.now(), type: 'info', msg: `Hour ${data.period} attendance logged for ${data.subject || ''}` },
          ...prev
        ]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [mockDate, mockTime, user]);

  const handleMarkClick = (periodNumber, subjectAcronym) => {
    navigate(`/attendance/${dayInfo.dayNumber}/${periodNumber}/${subjectAcronym}`);
  };

  const handleViewClick = (periodNumber) => {
    navigate(`/confirmation/${dayInfo.dayNumber}/${periodNumber}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', backgroundColor: 'var(--clr-gray-100)' }}>
        <div style={{ color: 'var(--clr-primary-700)', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="animate-pulse">Loading ERP Faculty Dashboard...</span>
        </div>
      </div>
    );
  }

  // Stats calculation
  const totalClasses = schedule.filter(s => s.subjectAcronym !== 'FREE').length;
  const myClasses = schedule.filter(s => s.subjectAcronym !== 'FREE' && (user.role === 'admin' || s.teacherId === user.teacherId));
  
  let activeCount = 0;
  let markedCount = 0;
  Object.keys(periodStatuses).forEach(pKey => {
    const stat = periodStatuses[pKey];
    if (stat?.markingOpen) activeCount++;
    if (stat?.marked) markedCount++;
  });

  return (
    <div style={{ padding: '1.5rem', minWidth: 0 }}>
      <div className="container animate-fade">
        <DateTimeBanner />

        {error && <div className="alert alert-danger mb-4">{error}</div>}

        {/* Live ERP Stat Indicators */}
        <div className="grid-4 mb-6">
          <div className="stat-card" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '16px' }}>
            <div className="stat-icon green"><GraduationCap size={24} /></div>
            <div>
              <div className="stat-number">64</div>
              <div className="stat-label">Roster Strength</div>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '16px' }}>
            <div className="stat-icon blue"><BookOpen size={24} /></div>
            <div>
              <div className="stat-number">{totalClasses}</div>
              <div className="stat-label">Total Slots Today</div>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '16px' }}>
            <div className="stat-icon amber"><Clock size={24} /></div>
            <div>
              <div className="stat-number">{activeCount}</div>
              <div className="stat-label">Active Slots</div>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '16px' }}>
            <div className="stat-icon teal"><CheckSquare size={24} /></div>
            <div>
              <div className="stat-number">{markedCount}</div>
              <div className="stat-label">Periods Logged</div>
            </div>
          </div>
        </div>

        {/* Dashboard Panels */}
        <div className="dashboard-panels" style={{ display: 'grid', gridTemplateColumns: '280px 1fr 280px', gap: '24px' }}>
          
          {/* Faculty Bio Card */}
          <div className="flex flex-col gap-4">
            <div className="card" style={{ borderRadius: '16px' }}>
              <div className="card-header">
                <h3 className="text-sm font-bold">ERP Profile File</h3>
              </div>
              <div className="card-body flex flex-col gap-3" style={{ fontSize: '13px' }}>
                <div>
                  <div className="text-xs text-muted uppercase font-semibold">User Role</div>
                  <div className="font-bold text-primary mt-1" style={{ textTransform: 'capitalize' }}>{user.role}</div>
                </div>
                <div>
                  <div className="text-xs text-muted uppercase font-semibold">Instructor Name</div>
                  <div className="font-bold mt-1">{user.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted uppercase font-semibold">Teacher ID</div>
                  <div className="font-mono text-sm mt-1">{user.teacherId}</div>
                </div>
                <div>
                  <div className="text-xs text-muted uppercase font-semibold">Department</div>
                  <div className="text-sm mt-1">{user.department || 'IT'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted uppercase font-semibold mb-1">Subject Scope</div>
                  <div className="flex gap-1 flex-wrap">
                    {user.assignedSubjects?.map(sub => (
                      <span key={sub} className="badge badge-present" style={{ fontSize: '10px' }}>{sub}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="alert alert-info" style={{ fontSize: '0.8rem', borderRadius: '12px' }}>
              <div>
                <strong>Lockout Rule:</strong> Log attendance during classes. Post-class corrections are permitted for exactly 15 minutes after slots complete.
              </div>
            </div>
          </div>

          {/* Timetable Slots Panel */}
          <div>
            {dayInfo?.isHoliday ? (
              <div className="empty-state card" style={{ borderRadius: '16px' }}>
                <div className="empty-icon">📅</div>
                <div className="empty-title">Holiday Declared</div>
                <div className="empty-text">No active schedule for {dayInfo.description || 'today'}.</div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Sequence Day: {dayInfo?.description || 'Active'}</h3>
                  <span className="text-xs text-muted">7-Slot Timetable Grid</span>
                </div>

                <div className="flex flex-col gap-3">
                  {schedule.map((slot) => {
                    const statusInfo = periodStatuses[slot.period] || {};
                    const isAssignedToMe = user.role === 'admin' || user.role === 'superadmin' || slot.teacherId === user.teacherId;
                    const isFree = slot.subjectAcronym === 'FREE' || !isAssignedToMe;

                    let cardClass = 'free';
                    let statusLabel = 'Locked / Closed';

                    if (statusInfo.marked) {
                      cardClass = 'marked';
                      statusLabel = 'Logged';
                    } else if (statusInfo.markingOpen && isAssignedToMe) {
                      cardClass = 'active';
                      statusLabel = 'Active Now';
                    } else if (!statusInfo.marked && isAssignedToMe) {
                      cardClass = 'upcoming';
                      statusLabel = 'Upcoming';
                    }

                    return (
                      <div 
                        key={slot.period} 
                        className={`period-card ${cardClass}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '100px 1fr 180px',
                          alignItems: 'center',
                          gap: '1.5rem',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div>
                          <span className="period-number">Hour {slot.period}</span>
                          <div className="period-time mt-1">{slot.startTime} - {slot.endTime}</div>
                        </div>

                        <div>
                          {isFree ? (
                            <span className="text-muted italic">Free Slot</span>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-primary">{slot.subjectAcronym}</span>
                                <span className="text-xs text-muted">({slot.classroom || 'LT-2'})</span>
                              </div>
                              <div className="text-xs text-muted mt-1">{slot.subjectName}</div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end items-center gap-3">
                          {isFree ? (
                            <span className="text-muted">-</span>
                          ) : statusInfo.marked ? (
                            <>
                              <div className="text-right">
                                <span className="badge badge-present">Logged</span>
                                <div className="text-xs text-muted mt-1">P:{statusInfo.summary?.present} A:{statusInfo.summary?.absent}</div>
                              </div>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleViewClick(slot.period)}>
                                <Eye size={12} />
                                <span>{statusInfo.isAllowedToEdit ? 'Edit' : 'View'}</span>
                              </button>
                            </>
                          ) : isAssignedToMe && statusInfo.markingOpen ? (
                            <button className="btn btn-primary" onClick={() => handleMarkClick(slot.period, slot.subjectAcronym)}>
                              <Play size={12} />
                              <span>Log Hours</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 text-muted text-xs">
                              <Lock size={12} />
                              <span>{statusLabel}</span>
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

          {/* Right Side Alerts Feed Panel */}
          <div className="flex flex-col gap-4">
            <div className="card animate-fade-in" style={{ borderRadius: '16px' }}>
              <div className="card-header flex items-center gap-2">
                <Bell size={16} className="text-primary" />
                <h3 className="text-sm font-bold">Attendance Alerts</h3>
              </div>
              <div className="card-body flex flex-col gap-3" style={{ padding: '16px' }}>
                {alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: alert.type === 'warning' ? '#fff1f2' : '#f0f9ff',
                      border: alert.type === 'warning' ? '1px solid #ffe4e6' : '1px solid #e0f2fe',
                      fontSize: '11px',
                      color: alert.type === 'warning' ? '#be123c' : '#0369a1',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start'
                    }}
                  >
                    <AlertTriangle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{alert.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
