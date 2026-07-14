import React, { useContext, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MockContext } from '../context/MockContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config';
import { 
  ArrowLeft, Check, X, Search, ShieldAlert, Timer, UserCheck, 
  AlertTriangle, BookOpen, User, Calendar, Clock, Award, FileText,
  Bookmark, CheckCircle2, RotateCcw, AlertCircle
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   Confirmation Modal — replaces browser window.confirm()
───────────────────────────────────────────────────────────────────────── */
const ConfirmModal = ({ onConfirm, onCancel, summary }) => (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  }}>
    <div style={{
      background: '#fff', borderRadius: '16px', padding: '32px',
      width: '440px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      animation: 'fadeUp 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <AlertTriangle size={22} color="#D97706" />
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Confirm Attendance Submission</h3>
          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>Make sure details are accurate before submitting.</p>
        </div>
      </div>

      <div style={{
        background: '#F9FAFB', borderRadius: '10px', padding: '16px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#16A34A' }}>{summary.present}</div>
          <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' }}>Present</div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid #E5E7EB', borderRight: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#DC2626' }}>{summary.absent}</div>
          <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' }}>Absent</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#D97706' }}>{summary.OD}</div>
          <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' }}>OD</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '11px', borderRadius: '9px',
            border: '1.5px solid #E5E7EB', background: '#fff',
            fontWeight: '600', fontSize: '14px', cursor: 'pointer', color: '#374151'
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1, padding: '11px', borderRadius: '9px',
            border: 'none', background: 'linear-gradient(135deg, #2e7d32, #388e3c)',
            fontWeight: '700', fontSize: '14px', cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 4px 12px rgba(46,125,50,0.3)'
          }}
        >
          <Check size={16} />
          Submit Now
        </button>
      </div>
    </div>
    <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────────────── */
const AttendancePage = ({ user }) => {
  const { dayNumber, period, subject } = useParams();
  const { mockDate, mockTime } = useContext(MockContext);
  const toast = useToast();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({}); // studentRegisterNumber -> 'Present' / 'Absent' / 'Late'
  const [remarks, setRemarks] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [classDetails, setClassDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Live time state updating every second
  const [liveTime, setLiveTime] = useState('');

  // Timer countdown state (seconds remaining)
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef(null);

  // Format date to: Monday, 09 July 2026
  const formatLongDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Stable mock percentage based on register number
  const getStudentHistoryPercent = (regNum) => {
    const num = parseInt(regNum.slice(-2)) || 5;
    const percent = 70 + (num % 28); // yields between 70% and 98%
    return percent;
  };

  // Clock ticks
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setLiveTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Fetch initial rosters and schedules
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. Fetch student roster
        const studentsRes = await fetch(`${API_BASE}/api/attendance/students`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (!studentsRes.ok) throw new Error('Failed to load students roster.');
        const studentList = await studentsRes.json();
        setStudents(studentList);

        // 2. Load Draft or Initialize Default state (all Present)
        const draftKey = `draft_attendance_${dayNumber}_${period}_${mockDate}`;
        const savedDraft = localStorage.getItem(draftKey);
        
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            setAttendanceState(parsed.state || {});
            setRemarks(parsed.remarks || '');
            setDraftSaved(true);
            toast.success('Restored saved draft attendance.');
          } catch {
            const initialState = {};
            studentList.forEach(student => { initialState[student.registerNumber] = 'Present'; });
            setAttendanceState(initialState);
          }
        } else {
          const initialState = {};
          studentList.forEach(student => { initialState[student.registerNumber] = 'Present'; });
          setAttendanceState(initialState);
        }

        // 3. Check if already marked
        const statusRes = await fetch(
          `${API_BASE}/api/attendance/status?date=${mockDate}&period=${period}&timetableDay=${dayNumber}&mockTime=${mockTime}`,
          { headers: { 'Authorization': `Bearer ${user.token}` } }
        );
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const assignedTeacherId = statusData.marked ? statusData.teacherId : statusData.assignedTeacher;
          if (user.role !== 'admin' && assignedTeacherId && assignedTeacherId !== user.teacherId) {
            setError('Unauthorized: You are not assigned to this period.');
            setLoading(false);
            return;
          }

          if (statusData.marked) {
            navigate(`/confirmation/${dayNumber}/${period}`);
            return;
          }
        }

        // 4. Fetch timetable slot details
        const timetableRes = await fetch(`${API_BASE}/api/timetable/my-schedule/${dayNumber}`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (timetableRes.ok) {
          const timetableData = await timetableRes.json();
          const slot = timetableData.schedule.find(s => s.period === Number(period));
          if (slot) {
            setClassDetails(slot);
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

  // Setup deadline countdown timer
  useEffect(() => {
    if (loading) return;

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
      setError('This period timetable window has closed. Submission locked.');
      return;
    }

    setSecondsLeft(diffMinutes * 60);

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

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, mockTime, period]);

  // Auto-save draft changes to localStorage while marking
  const handleStatusChange = (regNum, newStatus) => {
    const newState = { ...attendanceState, [regNum]: newStatus };
    setAttendanceState(newState);
    
    // Save draft
    const draftKey = `draft_attendance_${dayNumber}_${period}_${mockDate}`;
    localStorage.setItem(draftKey, JSON.stringify({ state: newState, remarks }));
    setDraftSaved(true);
  };

  const handleRemarksChange = (val) => {
    setRemarks(val);
    const draftKey = `draft_attendance_${dayNumber}_${period}_${mockDate}`;
    localStorage.setItem(draftKey, JSON.stringify({ state: attendanceState, remarks: val }));
    setDraftSaved(true);
  };

  const appendRemarkTag = (tag) => {
    const separator = remarks ? ', ' : '';
    handleRemarksChange(remarks + separator + tag);
  };

  const handleMarkAll = (status) => {
    const newState = {};
    students.forEach(student => { newState[student.registerNumber] = status; });
    setAttendanceState(newState);
    handleStatusChange(students[0]?.registerNumber, status); // triggers save
  };

  const handleReset = () => {
    const newState = {};
    students.forEach(student => { newState[student.registerNumber] = 'Present'; });
    setAttendanceState(newState);
    handleRemarksChange('');
    toast.info('Attendance reset to defaults.');
  };

  const handleSaveDraftManual = () => {
    const draftKey = `draft_attendance_${dayNumber}_${period}_${mockDate}`;
    localStorage.setItem(draftKey, JSON.stringify({ state: attendanceState, remarks }));
    setDraftSaved(true);
    toast.success('Draft saved successfully to local device.');
  };

  const handleSubmitClick = () => {
    if (secondsLeft <= 0 && user.role !== 'admin') {
      setError('Cannot submit: Time window has closed.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmedSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    setError('');

    const records = students.map(student => ({
      studentRegisterNumber: student.registerNumber,
      status: attendanceState[student.registerNumber]
    }));

    try {
      const response = await fetch(`${API_BASE}/api/attendance/submit`, {
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
          remarks, // Send optional remarks
          mockTime
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Clear local draft on successful submit
        const draftKey = `draft_attendance_${dayNumber}_${period}_${mockDate}`;
        localStorage.removeItem(draftKey);
        setIsSubmitted(true);
        setDraftSaved(false);
        toast.success('Attendance submitted successfully!');
      } else {
        setError(data.message || 'Failed to submit attendance.');
      }
    } catch (err) {
      setError('Connection failed. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSort = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  // Calculations for summary
  const totalCount = students.length;
  const presentCount = Object.values(attendanceState).filter(s => s === 'Present').length;
  const absentCount = Object.values(attendanceState).filter(s => s === 'Absent').length;
  const ODCount = Object.values(attendanceState).filter(s => s === 'OD').length;
  const attendancePercent = totalCount > 0 
    ? (((presentCount + ODCount) / totalCount) * 100).toFixed(2)
    : '0.00';

  const getModalSummary = () => ({
    present: presentCount,
    absent: absentCount,
    OD: ODCount,
  });

  const sortedStudents = [...students].sort((a, b) => {
    return sortDirection === 'asc'
      ? a.registerNumber.localeCompare(b.registerNumber)
      : b.registerNumber.localeCompare(a.registerNumber);
  });

  const filteredStudents = sortedStudents.filter(student =>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', backgroundColor: 'var(--clr-gray-50)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--clr-primary-100)', borderTopColor: 'var(--clr-primary-600)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--clr-primary-700)', fontWeight: '600', fontSize: '14px' }}>Loading Attendance Panel...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const isTimerExpired = secondsLeft <= 0 && user.role !== 'admin';
  const isLocked = isTimerExpired || isSubmitted;

  return (
    <>
      {showConfirmModal && (
        <ConfirmModal
          summary={getModalSummary()}
          onConfirm={handleConfirmedSubmit}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
      <style>{`
        @keyframes slideDown { 
          from { opacity: 0; transform: translateY(-16px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
      `}</style>

      <div style={{ backgroundColor: 'var(--clr-gray-50)', minHeight: 'calc(100vh - 64px)', padding: '24px 0' }}>
        <div className="container">

          {/* DESKTOP VIEW (Visible on >= 768px screens) */}
          <div className="hidden md:block">
            {isSubmitted && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px 24px',
                  marginBottom: '20px',
                  background: 'linear-gradient(135deg, var(--clr-primary-50), #d1fae5)',
                  border: '1.5px solid var(--clr-primary-200)',
                  borderLeft: '6px solid var(--clr-success)',
                  borderRadius: '16px',
                  animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--clr-success)',
                  color: '#fff',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  boxShadow: '0 4px 12px rgba(22,163,74,0.3)'
                }}>
                  <CheckCircle2 size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--clr-primary-900)' }}>
                    Attendance Submitted Successfully
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--clr-gray-600)' }}>
                    The records have been securely stored in the academic register. You can review the details below.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => navigate('/')}
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderColor: 'var(--clr-primary-200)',
                      background: 'var(--clr-white)',
                      padding: '8px 16px',
                      height: '38px'
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Go to Dashboard</span>
                  </button>
                </div>
              </div>
            )}

            {/* Header Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <button
                onClick={() => navigate('/')}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <ArrowLeft size={16} />
                <span>Back to Dashboard</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {draftSaved && (
                  <span className="badge badge-done" style={{ fontSize: '11px', textTransform: 'none' }}>
                    Auto-saved Draft
                  </span>
                )}
                {/* Deadline timer display */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px',
                  borderRadius: '20px',
                  border: isTimerExpired ? '1.5px solid #FCA5A5' : '1.5px solid var(--clr-primary-200)',
                  backgroundColor: isTimerExpired ? '#FEF2F2' : 'var(--clr-primary-50)'
                }}>
                  <Timer size={15} style={{ color: isTimerExpired ? 'var(--clr-danger)' : 'var(--clr-primary-600)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--clr-gray-500)' }}>Deadline: </span>
                  <span style={{
                    fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-mono)',
                    color: isTimerExpired ? 'var(--clr-danger)' : 'var(--clr-primary-700)'
                  }}>
                    {isTimerExpired ? 'LOCKED' : formatTimer(secondsLeft)}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger mb-4" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Page Grid Layout */}
            <div className="attendance-main">
              
              {/* Left Column: Info panels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. Faculty Information */}
                <div className="card">
                  <div className="card-header" style={{ padding: '12px 16px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--clr-gray-500)', letterSpacing: '0.04em' }}>Faculty Information</h3>
                  </div>
                  <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Faculty Name</label>
                      <div style={{ fontWeight: '700', color: 'var(--clr-primary-700)', fontSize: '14px' }}>{user.name}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Staff ID</label>
                      <div style={{ fontWeight: '600', color: 'var(--clr-gray-800)', fontFamily: 'var(--font-mono)' }}>{user.teacherId}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Department</label>
                      <div style={{ fontWeight: '600', color: 'var(--clr-gray-800)' }}>{user.department || 'IT'}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Date & Clock</label>
                      <div style={{ fontWeight: '600', color: 'var(--clr-gray-800)' }}>{formatLongDate(mockDate)}</div>
                      <div style={{ fontWeight: '700', color: 'var(--clr-primary-600)', fontFamily: 'var(--font-mono)', fontSize: '15px', marginTop: '2px' }}>
                        {liveTime || mockTime}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid var(--clr-gray-100)', paddingTop: '10px' }}>
                      <div>
                        <label style={{ fontSize: '9px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Academic Year</label>
                        <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--clr-gray-700)' }}>2026-2027</div>
                      </div>
                      <div>
                        <label style={{ fontSize: '9px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Semester</label>
                        <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--clr-gray-700)' }}>Odd (VII)</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Scheduled Class Details */}
                <div className="card">
                  <div className="card-header" style={{ padding: '12px 16px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--clr-gray-500)', letterSpacing: '0.04em' }}>Current Class Details</h3>
                  </div>
                  <div className="card-body" style={{ padding: '16px' }}>
                    {classDetails ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Subject</label>
                          <div style={{ fontWeight: '700', color: 'var(--clr-gray-900)' }}>{classDetails.subjectName}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Subject Code</label>
                            <div style={{ fontWeight: '600', color: 'var(--clr-gray-800)', fontSize: '13px' }}>{classDetails.subjectAcronym}</div>
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Classroom</label>
                            <div style={{ fontWeight: '600', color: 'var(--clr-gray-800)', fontSize: '13px' }}>{classDetails.classroom || 'LT-2'}</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Class Target</label>
                            <div style={{ fontWeight: '600', color: 'var(--clr-gray-800)', fontSize: '13px' }}>IV IT A</div>
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Period / Time</label>
                            <div style={{ fontWeight: '700', color: 'var(--clr-primary-700)', fontSize: '13px' }}>{period} Hour</div>
                            <div style={{ fontSize: '10px', color: 'var(--clr-gray-500)', fontFamily: 'var(--font-mono)' }}>{classDetails.startTime} - {classDetails.endTime}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--clr-gray-400)' }}>
                        <AlertCircle size={28} style={{ margin: '0 auto 8px', color: 'var(--clr-gray-300)' }} />
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>No class scheduled for this period.</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Previous Class History (Auxiliary) */}
                <div className="card">
                  <div className="card-header" style={{ padding: '12px 16px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--clr-gray-500)', letterSpacing: '0.04em' }}>Previous History</h3>
                  </div>
                  <div className="card-body" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px dashed var(--clr-gray-200)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--clr-gray-500)', fontWeight: '500' }}>Jul 08 (Hour 2)</span>
                      <span style={{ fontWeight: '700', color: 'var(--clr-success)' }}>93.33% (14/15)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px dashed var(--clr-gray-200)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--clr-gray-500)', fontWeight: '500' }}>Jul 07 (Hour 2)</span>
                      <span style={{ fontWeight: '700', color: 'var(--clr-success)' }}>86.67% (13/15)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--clr-gray-500)', fontWeight: '500' }}>Jul 06 (Hour 2)</span>
                      <span style={{ fontWeight: '700', color: 'var(--clr-success)' }}>93.33% (14/15)</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Attendance roster and details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Live Attendance Summary Ribbon */}
                <div className="card" style={{ borderLeft: '4px solid var(--clr-primary-600)' }}>
                  <div className="card-body" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                    
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--clr-gray-400)', fontWeight: '600', textTransform: 'uppercase' }}>Total Strength</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--clr-gray-900)' }}>{totalCount}</div>
                      </div>
                      <div style={{ width: '1px', backgroundColor: 'var(--clr-gray-200)' }} />
                      <div>
                        <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: '600', textTransform: 'uppercase' }}>Present</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: '#16A34A' }}>{presentCount}</div>
                      </div>
                      <div style={{ width: '1px', backgroundColor: 'var(--clr-gray-200)' }} />
                      <div>
                        <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: '600', textTransform: 'uppercase' }}>Absent</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: '#DC2626' }}>{absentCount}</div>
                      </div>
                      <div style={{ width: '1px', backgroundColor: 'var(--clr-gray-200)' }} />
                      <div>
                        <div style={{ fontSize: '11px', color: '#D97706', fontWeight: '600', textTransform: 'uppercase' }}>OD</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: '#D97706' }}>{ODCount}</div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--clr-primary-700)', fontWeight: '700', textTransform: 'uppercase' }}>Attendance Rate</div>
                      <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--clr-primary-700)', fontFamily: 'var(--font-mono)' }}>
                        {attendancePercent}%
                      </div>
                    </div>

                  </div>
                </div>

                {/* Roster list table card */}
                <div className="card">
                  <div className="card-body">
                    
                    {/* Table search & bulk controls header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', width: '320px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-gray-400)' }} />
                        <input
                          type="text"
                          placeholder="Search by student name or roll no..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="input-field"
                          style={{ paddingLeft: '40px', height: '36px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleMarkAll('Present')} className="btn btn-secondary btn-sm" disabled={isLocked}>
                          Mark All Present
                        </button>
                        <button onClick={() => handleMarkAll('Absent')} className="btn btn-secondary btn-sm" disabled={isLocked}>
                          Mark All Absent
                        </button>
                        <button onClick={handleReset} className="btn btn-secondary btn-sm" style={{ gap: '4px' }} disabled={isLocked}>
                          <RotateCcw size={12} />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>

                    {/* Student Table */}
                    <div className="data-table-wrap" style={{ border: '1px solid var(--clr-gray-200)', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--clr-gray-50)', borderBottom: '2px solid var(--clr-gray-200)' }}>
                            <th style={{ width: '60px', padding: '12px', textAlign: 'center' }}>S.No</th>
                            <th 
                              onClick={toggleSort}
                              style={{ width: '150px', padding: '12px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>Roll Number</span>
                                <span style={{ fontSize: '10px', color: 'var(--clr-gray-400)' }}>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                              </div>
                            </th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Student Name & details</th>
                            <th style={{ width: '100px', padding: '12px', textAlign: 'center' }}>Present</th>
                            <th style={{ width: '100px', padding: '12px', textAlign: 'center' }}>Absent</th>
                            <th style={{ width: '100px', padding: '12px', textAlign: 'center' }}>OD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.length > 0 ? (
                            filteredStudents.map((student, index) => {
                              const status = attendanceState[student.registerNumber] || 'Present';
                              const overallPercent = getStudentHistoryPercent(student.registerNumber);
                              const hasLowAttendance = overallPercent < 75;

                              return (
                                <tr 
                                  key={student.registerNumber} 
                                  style={{ 
                                    borderBottom: '1px solid var(--clr-gray-100)', 
                                    backgroundColor: hasLowAttendance ? '#FFF5F5' : 'transparent',
                                    transition: 'background-color 0.2s'
                                  }}
                                >
                                  <td style={{ textAlign: 'center', padding: '12px', color: 'var(--clr-gray-400)', fontSize: '13px' }}>{index + 1}</td>
                                  <td style={{ padding: '12px', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--clr-gray-600)', fontSize: '13px' }}>
                                    {student.registerNumber}
                                  </td>
                                  <td style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <div style={{ fontWeight: '600', color: 'var(--clr-gray-800)', fontSize: '14px' }}>{student.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--clr-gray-500)', display: 'flex', gap: '6px', marginTop: '2px' }}>
                                          <span>Dept: {student.department}</span>
                                          <span>•</span>
                                          <span>Year: {student.year}</span>
                                          <span>•</span>
                                          <span>Sec: {student.section}</span>
                                        </div>
                                      </div>
                                      <span 
                                        className={`badge ${hasLowAttendance ? 'badge-absent' : 'badge-present'}`}
                                        style={{ fontSize: '10px', padding: '2px 8px' }}
                                        title="Student Overall Attendance History"
                                      >
                                        History: {overallPercent}%
                                      </span>
                                    </div>
                                  </td>
                                  {/* Present Col */}
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
                                      <input 
                                        type="radio" 
                                        name={`status-${student.registerNumber}`}
                                        checked={status === 'Present'}
                                        onChange={() => handleStatusChange(student.registerNumber, 'Present')}
                                        disabled={isLocked}
                                        style={{ width: '18px', height: '18px', accentColor: '#16A34A', cursor: 'pointer' }}
                                      />
                                    </label>
                                  </td>
                                  {/* Absent Col */}
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
                                      <input 
                                        type="radio" 
                                        name={`status-${student.registerNumber}`}
                                        checked={status === 'Absent'}
                                        onChange={() => handleStatusChange(student.registerNumber, 'Absent')}
                                        disabled={isLocked}
                                        style={{ width: '18px', height: '18px', accentColor: '#DC2626', cursor: 'pointer' }}
                                      />
                                    </label>
                                  </td>
                                  {/* Late Col */}
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
                                      <input 
                                        type="radio" 
                                        name={`status-${student.registerNumber}`}
                                        checked={status === 'OD'}
                                        onChange={() => handleStatusChange(student.registerNumber, 'OD')}
                                        disabled={isLocked}
                                        style={{ width: '18px', height: '18px', accentColor: '#D97706', cursor: 'pointer' }}
                                      />
                                    </label>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', color: 'var(--clr-gray-400)', padding: '32px' }}>
                                No students matching search query.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* 5. Remarks Section */}
                    <div style={{ marginTop: '24px', borderTop: '1px solid var(--clr-gray-100)', paddingTop: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--clr-gray-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Session Remarks (Optional)
                        </label>
                        <span style={{ fontSize: '11px', color: 'var(--clr-gray-400)' }}>
                          Select quick tags to insert
                        </span>
                      </div>

                      {/* Predefined quick tags */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        {['Lab Exam', 'Seminar', 'Industrial Visit', 'Internal Test'].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => appendRemarkTag(tag)}
                            disabled={isLocked}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 10px', fontSize: '11px', borderRadius: '15px' }}
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>

                      <textarea
                        placeholder="Enter session details, remarks, or leave empty..."
                        value={remarks}
                        onChange={(e) => handleRemarksChange(e.target.value)}
                        disabled={isLocked}
                        className="input-field"
                        style={{ height: '72px', padding: '10px', fontSize: '13px', resize: 'vertical' }}
                      />
                    </div>

                    {/* 6. Form Submission Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid var(--clr-gray-100)', paddingTop: '20px' }}>
                      <div>
                        <button
                          type="button"
                          onClick={handleSaveDraftManual}
                          disabled={isLocked}
                          className="btn btn-secondary"
                          style={{ borderStyle: 'dashed' }}
                        >
                          <Bookmark size={15} />
                          <span>Save Draft</span>
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => navigate('/')}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitClick}
                          disabled={submitting || isLocked || students.length === 0}
                          className="btn btn-primary"
                          style={{ padding: '10px 24px' }}
                        >
                          <UserCheck size={16} />
                          <span>{isSubmitted ? 'Submitted' : submitting ? 'Submitting...' : 'Submit Attendance'}</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* MOBILE VIEW (Visible on < 768px screens) */}
          <div className="block md:hidden">
            {/* Minimal Mobile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--clr-gray-900)', margin: 0 }}>
                  Take Attendance
                </h1>
                {classDetails && (
                  <p style={{ fontSize: '12px', color: 'var(--clr-gray-505, #64748b)', margin: '2px 0 0 0' }}>
                    {classDetails.subjectAcronym} · Hour {period}
                  </p>
                )}
              </div>
            </div>

            {/* Success message banner for mobile */}
            {isSubmitted && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  background: 'linear-gradient(135deg, var(--clr-primary-50), #d1fae5)',
                  border: '1.5px solid var(--clr-primary-200)',
                  borderLeft: '6px solid var(--clr-success)',
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                <CheckCircle2 size={24} style={{ color: 'var(--clr-success)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--clr-primary-900)' }}>
                    Submitted Successfully
                  </h4>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="alert alert-danger mb-4" style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px' }}>
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px' }}>{error}</span>
              </div>
            )}

            {/* Student Cards Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '90px' }}>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const status = attendanceState[student.registerNumber] || 'Present';
                  return (
                    <div
                      key={student.registerNumber}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        border: '1px solid #f1f5f9'
                      }}
                    >
                      {/* Left Column: Student Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: '700', 
                          color: '#1e293b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block'
                        }}>
                          {student.name}
                        </span>
                      </div>

                      {/* Right Column: Attendance Status Dropdown */}
                      <div style={{ width: '110px', flexShrink: 0 }}>
                        <select
                          value={status}
                          onChange={(e) => handleStatusChange(student.registerNumber, e.target.value)}
                          disabled={isLocked || isSubmitted}
                          style={{
                            width: '100%',
                            minHeight: '40px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            padding: '0 8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            backgroundColor: '#ffffff',
                            color: status === 'Present' ? '#16a34a' : status === 'Absent' ? '#dc2626' : '#d97706',
                            cursor: (isLocked || isSubmitted) ? 'not-allowed' : 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="Present" style={{ color: '#16a34a', fontWeight: 'bold' }}>Present</option>
                          <option value="Absent" style={{ color: '#dc2626', fontWeight: 'bold' }}>Absent</option>
                          <option value="OD" style={{ color: '#d97706', fontWeight: 'bold' }}>OD</option>
                        </select>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '32px', fontSize: '14px' }}>
                  No students matching search query.
                </div>
              )}
            </div>

            {/* Sticky Save Button at Bottom */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              padding: '12px 16px',
              borderTop: '1px solid #e2e8f0',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
              zIndex: 999
            }}>
              <button
                type="button"
                onClick={handleSubmitClick}
                disabled={submitting || isLocked || isSubmitted || students.length === 0}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  minHeight: '48px',
                  borderRadius: '24px',
                  fontSize: '15px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--clr-primary-700, #1b5e20)',
                  boxShadow: '0 4px 12px rgba(27,94,32,0.25)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: (submitting || isLocked || isSubmitted || students.length === 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? (
                  <div style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                ) : <UserCheck size={18} />}
                <span>{isSubmitted ? 'Submitted Successfully' : submitting ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AttendancePage;
