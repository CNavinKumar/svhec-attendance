import React, { useContext, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MockContext } from '../context/MockContext';
import { ArrowLeft, Check, X, Search, ShieldAlert, Timer } from 'lucide-react';

const AttendancePage = ({ user }) => {
  const { dayNumber, period, subject } = useParams();
  const { mockDate, mockTime } = useContext(MockContext);
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({}); // studentRegisterNumber -> 'Present' / 'Absent' / 'OD'
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Timer countdown state (seconds remaining)
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef(null);

  // Initialize and fetch students
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch student roster
        const studentsRes = await fetch('http://localhost:5000/api/attendance/students', {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        if (!studentsRes.ok) throw new Error('Failed to load students roster.');
        const studentList = await studentsRes.json();
        setStudents(studentList);

        // Initialize all as 'Present' by default
        const initialState = {};
        studentList.forEach(student => {
          initialState[student.registerNumber] = 'Present';
        });
        setAttendanceState(initialState);

        // Fetch if already marked (to prevent double marking/override if somehow accessed)
        const statusRes = await fetch(`http://localhost:5000/api/attendance/status?date=${mockDate}&period=${period}&timetableDay=${dayNumber}&mockTime=${mockTime}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.marked) {
            navigate(`/confirmation/${dayNumber}/${period}`);
            return;
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [dayNumber, period, mockDate, user]);

  // Calculate and setup the timer
  useEffect(() => {
    if (loading) return;

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
    const diffMinutes = endTimeVal - mockTimeVal;

    if (diffMinutes <= 0) {
      setSecondsLeft(0);
      setError('This period schedule has expired. You cannot submit new attendance.');
      return;
    }

    setSecondsLeft(diffMinutes * 60);

    // Start ticker
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setError('Time window has expired! Submission locked.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, mockTime, period]);

  const handleStatusChange = (regNum, newStatus) => {
    setAttendanceState(prev => ({
      ...prev,
      [regNum]: newStatus
    }));
  };

  const handleMarkAll = (status) => {
    const newState = {};
    students.forEach(student => {
      newState[student.registerNumber] = status;
    });
    setAttendanceState(newState);
  };

  const handleSubmit = async () => {
    if (secondsLeft <= 0 && user.role !== 'admin') {
      setError('Cannot submit: Time window has closed.');
      return;
    }

    setSubmitting(true);
    setError('');

    // Prepare records
    const records = students.map(student => ({
      studentRegisterNumber: student.registerNumber,
      status: attendanceState[student.registerNumber]
    }));

    try {
      const response = await fetch('http://localhost:5000/api/attendance/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          date: mockDate,
          timetableDay: Number(dayNumber),
          period: Number(period),
          subject,
          records,
          mockTime // Send mock time to align backend checks
        })
      });

      const data = await response.json();

      if (response.ok) {
        navigate(`/confirmation/${dayInfo?.dayNumber || dayNumber}/${period}`);
      } else {
        setError(data.message || 'Failed to submit attendance.');
      }
    } catch (err) {
      setError('Connection failed. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter students based on search term
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.registerNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading student roster...</div>
      </div>
    );
  }

  const isTimerExpired = secondsLeft <= 0 && user.role !== 'admin';

  return (
    <div className="container" style={{ padding: '32px 24px', animation: 'fadeIn 0.3s ease' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button 
          onClick={() => navigate('/')} 
          className="btn-secondary" 
          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        {/* Floating Timer Countdown */}
        <div 
          className="glass-panel" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '10px 20px', 
            borderColor: isTimerExpired ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
            background: isTimerExpired ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)'
          }}
        >
          <Timer size={18} style={{ color: isTimerExpired ? 'var(--color-danger)' : 'var(--color-success)' }} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Marking Period Closes in</div>
            <div style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'monospace', color: isTimerExpired ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {isTimerExpired ? 'LOCKED' : formatTimer(secondsLeft)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Info panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px' }}>Mark Student Attendance</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Day {dayNumber} • Period {period} • Subject: <strong>{subject}</strong>
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => handleMarkAll('Present')} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12px', borderColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)' }}>
              All Present
            </button>
            <button onClick={() => handleMarkAll('Absent')} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12px', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)' }}>
              All Absent
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-danger)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Student list container */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          
          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '360px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by name or register number..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field" 
              style={{ paddingLeft: '40px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px' }}
            />
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
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student, index) => {
                    const status = attendanceState[student.registerNumber];
                    
                    return (
                      <tr key={student.registerNumber}>
                        <td>{index + 1}</td>
                        <td style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{student.registerNumber}</td>
                        <td style={{ fontWeight: '500' }}>{student.name}</td>
                        <td style={{ display: 'flex', justifyContent: 'center' }}>
                          <div className="attendance-toggle-group">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.registerNumber, 'Present')}
                              className={`attendance-toggle-btn ${status === 'Present' ? 'active-Present' : ''}`}
                              disabled={isTimerExpired}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.registerNumber, 'Absent')}
                              className={`attendance-toggle-btn ${status === 'Absent' ? 'active-Absent' : ''}`}
                              disabled={isTimerExpired}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.registerNumber, 'OD')}
                              className={`attendance-toggle-btn ${status === 'OD' ? 'active-OD' : ''}`}
                              disabled={isTimerExpired}
                            >
                              On Duty (OD)
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      No students found matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Submit panel */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '16px' }}>
            <button 
              type="button" 
              onClick={() => navigate('/')} 
              className="btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              className="btn-primary"
              disabled={submitting || isTimerExpired || students.length === 0}
            >
              <Check size={18} />
              <span>{submitting ? 'Submitting...' : 'Submit Attendance'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AttendancePage;
