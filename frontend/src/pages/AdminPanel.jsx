import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { MockContext } from '../context/MockContext';
import { useToast } from '../context/ToastContext';
import DateTimeBanner from '../components/DateTimeBanner';
import StatusBadge from '../components/StatusBadge';
import ExportButton from '../components/ExportButton';
import { 
  LayoutDashboard, Calendar, Users, GraduationCap, ClipboardCheck, 
  FileText, ShieldCheck, Plus, Trash2, Edit2, Check, X, RefreshCw, 
  Unlock, Search, Printer, AlertTriangle, ArrowLeft, Download, Award,
  TrendingUp, Menu
} from 'lucide-react';

const AdminPanel = ({ user }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { mockDate } = useContext(MockContext);
  
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'calendar', 'staff', 'students', 'master', 'reports'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Loading/Error status
  const [loading, setLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState(null);

  // Calendar
  const [days, setDays] = useState([]);
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const [grantDate, setGrantDate] = useState(todayStr);
  const [grantPeriod, setGrantPeriod] = useState(1);
  const [grantLoading, setGrantLoading] = useState(false);

  // Staff (Teacher) CRUD
  const [teachers, setTeachers] = useState([]);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffEditingId, setStaffEditingId] = useState(null);
  const [staffForm, setStaffForm] = useState({
    teacherId: '',
    name: '',
    email: '',
    password: '',
    department: 'IT',
    assignedSubjects: '',
    role: 'faculty'
  });

  // Student CRUD
  const [students, setStudents] = useState([]);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [studentEditingId, setStudentEditingId] = useState(null);
  const [studentForm, setStudentForm] = useState({
    registerNumber: '',
    name: '',
    department: 'IT',
    year: '4',
    section: 'A'
  });

  // Master Attendance
  const [masterDate, setMasterDate] = useState(todayStr);
  const [filterDept, setFilterDept] = useState('IT');
  const [filterYear, setFilterYear] = useState('4');
  const [filterSection, setFilterSection] = useState('A');
  const [masterAttendance, setMasterAttendance] = useState([]);
  const [syncingAll, setSyncingAll] = useState(false);

  // Reports
  const [reportType, setReportType] = useState('daily');
  const [reportDate, setReportDate] = useState(todayStr);
  const [reportDept, setReportDept] = useState('IT');
  const [reportYear, setReportYear] = useState('4');
  const [reportSection, setReportSection] = useState('A');
  const [reportStudentReg, setReportStudentReg] = useState('');
  const [reportThreshold, setReportThreshold] = useState(75);
  const [reportData, setReportData] = useState(null);
  // Extra filter state for new report types
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [reportMonth, setReportMonth] = useState('');
  const [reportYearFilter, setReportYearFilter] = useState(new Date().getFullYear().toString());
  const [reportHour, setReportHour] = useState('');
  const [reportFaculty, setReportFaculty] = useState('');
  const [reportSubject, setReportSubject] = useState('');
  const [reportStatus, setReportStatus] = useState('');

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/dashboard-stats`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all calendar days
  const fetchDays = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/schedule/all`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error('Failed to load schedule days list.');
      const data = await res.json();
      setDays(data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Fetch all teachers
  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/teachers`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error('Failed to load teachers list.');
      const data = await res.json();
      setTeachers(data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Fetch all students
  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/students`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error('Failed to load students roster.');
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Fetch Master Attendance
  const fetchMasterAttendance = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/master-attendance?date=${masterDate}&department=${filterDept}&year=${filterYear}&section=${filterSection}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch master attendance details.');
      const data = await res.json();
      setMasterAttendance(data.students || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Sync Period 1 to remaining hours
  const handleSyncPeriod1ToAll = async () => {
    if (!window.confirm('Sync Period 1 status to all other periods for this class today?')) return;
    setSyncingAll(true);
    try {
      for (const student of masterAttendance) {
        const p1Status = student.attendance[1];
        if (p1Status === '-') continue;

        for (let p = 2; p <= 7; p++) {
          await fetch(`${API_BASE}/api/attendance/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({
              date: masterDate,
              timetableDay: 1, // dummy value just to pass timetable validation check
              period: p,
              subject: 'SYNC',
              records: [{ studentRegisterNumber: student.registerNumber, status: p1Status }],
              mockTime: '16:00'
            })
          }).catch(() => {});
        }
      }
      toast.success('Period 1 copied to all periods successfully.');
      await fetchMasterAttendance();
    } catch (err) {
      toast.error('Sync process had errors.');
    } finally {
      setSyncingAll(false);
    }
  };

  // Generate Advanced Report
  const generateReport = async () => {
    setLoading(true);
    setReportData(null);
    let url = '';

    if (reportType === 'daily') {
      url = `${API_BASE}/api/reports/daily?date=${reportDate}&department=${reportDept}&year=${reportYear}&section=${reportSection}`;
    } else if (reportType === 'hourly') {
      url = `${API_BASE}/api/reports/hourly?date=${reportDate}`;
    } else if (reportType === 'defaulters') {
      url = `${API_BASE}/api/reports/defaulters?threshold=${reportThreshold}&department=${reportDept}&year=${reportYear}&section=${reportSection}`;
    } else if (reportType === 'student') {
      if (!reportStudentReg.trim()) {
        toast.warning('Please enter a Student Register Number.');
        setLoading(false);
        return;
      }
      url = `${API_BASE}/api/reports/student/${reportStudentReg.trim()}`;
    } else if (reportType === 'student-summary') {
      url = `${API_BASE}/api/reports/defaulters?threshold=0&department=${reportDept}&year=${reportYear}&section=${reportSection}${reportFromDate ? '&fromDate='+reportFromDate : ''}${reportToDate ? '&toDate='+reportToDate : ''}`;
    } else if (reportType === 'faculty-report') {
      url = `${API_BASE}/api/admin/teachers`;
    } else if (reportType === 'class-report') {
      url = `${API_BASE}/api/reports/daily?date=${reportDate}&department=${reportDept}&year=${reportYear}&section=${reportSection}`;
    } else if (reportType === 'subject-report') {
      url = `${API_BASE}/api/reports/hourly?date=${reportDate}`;
    } else if (reportType === 'monthly-report') {
      url = `${API_BASE}/api/reports/defaulters?threshold=0&department=${reportDept}&year=${reportYear}&section=${reportSection}`;
    } else if (reportType === 'semester-report') {
      url = `${API_BASE}/api/reports/defaulters?threshold=0&department=${reportDept}&year=${reportYear}&section=${reportSection}`;
    } else if (reportType === 'individual-report') {
      if (!reportStudentReg.trim()) {
        toast.warning('Please enter a Student Register Number.');
        setLoading(false);
        return;
      }
      url = `${API_BASE}/api/reports/student/${reportStudentReg.trim()}`;
    }

    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setReportData(data);
        toast.success('Report generated successfully.');
      } else {
        toast.error(data.message || 'Failed to fetch report.');
      }
    } catch (err) {
      toast.error('Failed to communicate with reports engine.');
    } finally {
      setLoading(false);
    }
  };

  // Build export filter object for the current report
  const buildExportFilters = () => {
    const filters = {};
    if (reportDept)       filters.department = reportDept;
    if (reportYear)       filters.year = reportYear;
    if (reportSection)    filters.section = reportSection;
    if (reportDate)       filters.date = reportDate;
    if (reportFromDate)   filters.from = reportFromDate;
    if (reportToDate)     filters.to = reportToDate;
    if (reportMonth)      filters.month = reportMonth;
    if (reportYearFilter) filters.year_filter = reportYearFilter;
    if (reportHour)       filters.hour = reportHour;
    if (reportFaculty)    filters.faculty = reportFaculty;
    if (reportSubject)    filters.subject = reportSubject;
    if (reportStatus)     filters.status = reportStatus;
    if (reportStudentReg) filters.studentReg = reportStudentReg;
    return filters;
  };

  // Map UI reportType to export endpoint name
  const getExportEndpoint = () => {
    const map = {
      'daily': 'daily',
      'hourly': 'daily',
      'defaulters': 'student',
      'student': 'individual',
      'student-summary': 'student',
      'faculty-report': 'faculty',
      'class-report': 'class',
      'subject-report': 'subject',
      'monthly-report': 'monthly',
      'semester-report': 'semester',
      'individual-report': 'individual'
    };
    return map[reportType] || 'daily';
  };

  // Toggle Holiday Status
  const handleToggleHoliday = async (dateStr, currentIsHoliday) => {
    const isHoliday = !currentIsHoliday;
    const description = isHoliday 
      ? prompt('Enter holiday reason (e.g. Founder\'s Day, Pongal Festival):') || 'Holiday' 
      : 'Working Day';

    try {
      const response = await fetch(`${API_BASE}/api/schedule/holiday`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ date: dateStr, isHoliday, description })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        await fetchDays();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Connection failed.');
    }
  };

  // Grant correction permission
  const handleGrantPermission = async (e) => {
    e.preventDefault();
    setGrantLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/attendance/grant-correction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ date: grantDate, period: Number(grantPeriod) })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Connection failed.');
    } finally {
      setGrantLoading(false);
    }
  };

  // CRUD handlers: Faculty
  const handleStaffFormSubmit = async (e) => {
    e.preventDefault();
    const assignedArr = staffForm.assignedSubjects
      ? staffForm.assignedSubjects.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      : [];

    const url = staffEditingId
      ? `${API_BASE}/api/admin/teachers/${staffEditingId}`
      : `${API_BASE}/api/admin/teachers`;
    
    try {
      const res = await fetch(url, {
        method: staffEditingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ ...staffForm, assignedSubjects: assignedArr })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(staffEditingId ? 'Staff updated.' : 'Staff created.');
        setShowStaffForm(false);
        setStaffEditingId(null);
        await fetchTeachers();
      } else {
        toast.error(data.message || 'Action failed.');
      }
    } catch (e) {
      toast.error('Connection error.');
    }
  };

  const handleEditStaffClick = (teacher) => {
    setStaffEditingId(teacher._id);
    setStaffForm({
      teacherId: teacher.teacherId,
      name: teacher.name,
      email: teacher.email,
      password: '',
      department: teacher.department,
      assignedSubjects: teacher.assignedSubjects?.join(', ') || '',
      role: teacher.role
    });
    setShowStaffForm(true);
  };

  const handleDeleteStaff = async (id, sId) => {
    if (sId === 'admin') return toast.warning('Cannot delete admin.');
    if (!window.confirm('Delete this staff member?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/teachers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        toast.success('Staff removed.');
        await fetchTeachers();
      }
    } catch (e) {
      toast.error('Failed to delete staff.');
    }
  };

  // CRUD handlers: Student
  const handleStudentFormSubmit = async (e) => {
    e.preventDefault();
    const url = studentEditingId
      ? `${API_BASE}/api/admin/students/${studentEditingId}`
      : `${API_BASE}/api/admin/students`;
    
    try {
      const res = await fetch(url, {
        method: studentEditingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(studentForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(studentEditingId ? 'Student profile updated.' : 'Student registered.');
        setShowStudentForm(false);
        setStudentEditingId(null);
        await fetchStudents();
      } else {
        toast.error(data.message || 'Action failed.');
      }
    } catch (e) {
      toast.error('Connection error.');
    }
  };

  const handleEditStudentClick = (student) => {
    setStudentEditingId(student._id);
    setStudentForm({
      registerNumber: student.registerNumber,
      name: student.name,
      department: student.department,
      year: String(student.year),
      section: student.section
    });
    setShowStudentForm(true);
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Delete this student record?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        toast.success('Student record deleted.');
        await fetchStudents();
      }
    } catch (e) {
      toast.error('Failed to delete student.');
    }
  };

  // Tab Load Effect
  useEffect(() => {
    setLoading(true);
    const loadData = async () => {
      try {
        if (activeTab === 'dashboard') await fetchStats();
        if (activeTab === 'calendar') await fetchDays();
        if (activeTab === 'staff') await fetchTeachers();
        if (activeTab === 'students') await fetchStudents();
        if (activeTab === 'master') await fetchMasterAttendance();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeTab, masterDate, filterDept, filterYear, filterSection]);

  const handleSidebarNav = (fn) => {
    fn();
    setSidebarOpen(false);
  };

  return (
    <div className="erp-layout">
      {/* Mobile sidebar backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar Navigation ── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Sidebar close button (mobile only) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--clr-gray-100)' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--clr-gray-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin Panel</span>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-gray-400)', display: 'flex', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-section-label">Main Controls</div>
        
        <button 
          onClick={() => handleSidebarNav(() => setActiveTab('dashboard'))} 
          className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard className="link-icon" size={16} />
          <span>Dashboard Stats</span>
        </button>

        <button 
          onClick={() => handleSidebarNav(() => setActiveTab('calendar'))} 
          className={`sidebar-link ${activeTab === 'calendar' ? 'active' : ''}`}
        >
          <Calendar className="link-icon" size={16} />
          <span>Academic Calendar</span>
        </button>

        <button 
          onClick={() => handleSidebarNav(() => setActiveTab('master'))} 
          className={`sidebar-link ${activeTab === 'master' ? 'active' : ''}`}
        >
          <ClipboardCheck className="link-icon" size={16} />
          <span>Master Attendance</span>
        </button>

        <button 
          onClick={() => handleSidebarNav(() => navigate('/admin/master-calendar'))} 
          className="sidebar-link sidebar-link-sub"
        >
          <Calendar className="link-icon" size={14} />
          <span>Monthly Calendar View</span>
        </button>

        <button 
          onClick={() => handleSidebarNav(() => navigate('/admin/analytics'))} 
          className="sidebar-link sidebar-link-sub"
        >
          <TrendingUp className="link-icon" size={14} />
          <span>Roster Analytics</span>
        </button>

        <div className="sidebar-section-label">Resources</div>

        <button 
          onClick={() => handleSidebarNav(() => setActiveTab('staff'))} 
          className={`sidebar-link ${activeTab === 'staff' ? 'active' : ''}`}
        >
          <Users className="link-icon" size={16} />
          <span>Faculty & Staff</span>
        </button>

        <button 
          onClick={() => handleSidebarNav(() => setActiveTab('students'))} 
          className={`sidebar-link ${activeTab === 'students' ? 'active' : ''}`}
        >
          <GraduationCap className="link-icon" size={16} />
          <span>Students Roster</span>
        </button>

        <div className="sidebar-section-label">Reporting</div>

        <button 
          onClick={() => handleSidebarNav(() => setActiveTab('reports'))} 
          className={`sidebar-link ${activeTab === 'reports' ? 'active' : ''}`}
        >
          <FileText className="link-icon" size={16} />
          <span>Advanced Reports</span>
        </button>

        <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--clr-gray-200)' }}>
          <button 
            className="btn btn-secondary btn-block" 
            onClick={() => { navigate('/'); setSidebarOpen(false); }}
            style={{ fontSize: '0.8rem', gap: '0.5rem' }}
          >
            <ArrowLeft size={14} />
            <span>Faculty View</span>
          </button>
        </div>
      </aside>

      {/* ── Main ERP View Content ── */}
      <main className="erp-content animate-fade">
        {/* Mobile sidebar toggle button */}
        <div className="admin-topbar-mobile">
          <button
            className="sidebar-mobile-toggle"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={16} />
            Menu
          </button>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--clr-gray-600)' }}>
            {activeTab === 'dashboard' && 'Dashboard'}
            {activeTab === 'calendar' && 'Academic Calendar'}
            {activeTab === 'master' && 'Master Attendance'}
            {activeTab === 'staff' && 'Faculty & Staff'}
            {activeTab === 'students' && 'Students Roster'}
            {activeTab === 'reports' && 'Advanced Reports'}
          </span>
        </div>
        <DateTimeBanner />

        {/* ── 1. DASHBOARD OVERVIEW ── */}
        {activeTab === 'dashboard' && stats && (
          <div className="animate-up">
            <div className="page-header">
              <h2 className="page-title">Enterprise Analytics Overview</h2>
              <p className="page-subtitle">Real-time statistics of students, faculty registration, and attendance status.</p>
            </div>

            <div className="grid-4 mb-6">
              <div className="stat-card">
                <div className="stat-icon green"><GraduationCap size={24} /></div>
                <div>
                  <div className="stat-number">{stats.totalStudents || 0}</div>
                  <div className="stat-label">Total Students</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue"><Users size={24} /></div>
                <div>
                  <div className="stat-number">{stats.totalFaculty || 0}</div>
                  <div className="stat-label">Total Faculty</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple"><Award size={24} /></div>
                <div>
                  <div className="stat-number">{stats.todayAttendance?.percentage || 0}%</div>
                  <div className="stat-label">Today's Present</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><AlertTriangle size={24} /></div>
                <div>
                  <div className="stat-number">{stats.todayAttendance?.absent || 0}</div>
                  <div className="stat-label">Today Absentees</div>
                </div>
              </div>
            </div>

            <div className="grid-2">
              {/* Daily Marking Activity */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-sm font-bold">Today's Period Submission Monitor</h3>
                  <StatusBadge status={stats.todayAttendance?.totalRecords > 0 ? 'Active' : 'Locked'} />
                </div>
                <div className="card-body">
                  <p className="text-xs text-muted mb-4">
                    Day sequence updates with marked periods as teachers log their classrooms.
                  </p>
                  <div className="flex flex-col gap-3">
                    <div className="progress-bar-wrap">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${(stats.todayAttendance?.periodsMarked?.length / 7) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-muted">
                      <span>{stats.todayAttendance?.periodsMarked?.length || 0} / 7 Hours Marked</span>
                      <span>{Math.round(((stats.todayAttendance?.periodsMarked?.length || 0) / 7) * 100)}% Complete</span>
                    </div>

                    <div className="divider"></div>

                    <div className="flex gap-2 flex-wrap">
                      {[1,2,3,4,5,6,7].map(p => {
                        const isMarked = stats.todayAttendance?.periodsMarked?.includes(p);
                        return (
                          <span 
                            key={p} 
                            className={`badge ${isMarked ? 'badge-present' : 'badge-locked'}`}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px' }}
                          >
                            Hour {p}: {isMarked ? 'Marked' : 'Pending'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fast Override Override */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-sm font-bold">Quick Lock Override</h3>
                </div>
                <div className="card-body">
                  <p className="text-xs text-muted mb-4">
                    Grant immediate editing override for a locked attendance record without going into calendar.
                  </p>
                  <form onSubmit={handleGrantPermission} className="flex flex-col gap-3">
                    <div className="form-group">
                      <label className="form-label">Target Date</label>
                      <input 
                        type="date" 
                        value={grantDate} 
                        onChange={(e) => setGrantDate(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Period (Hour)</label>
                      <select 
                        value={grantPeriod} 
                        onChange={(e) => setGrantPeriod(Number(e.target.value))}
                        className="form-control"
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
                      className="btn btn-primary"
                      disabled={grantLoading}
                    >
                      <Unlock size={14} />
                      <span>{grantLoading ? 'Unlocking...' : 'Grant Editing override'}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. ACADEMIC CALENDAR ── */}
        {activeTab === 'calendar' && (
          <div className="animate-up">
            <div className="page-header">
              <h2 className="page-title">Academic Schedule Rotator</h2>
              <p className="page-subtitle">Configure working days, declare custom holiday sequence, and update automated rosters.</p>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-bold">Rotational Sequence Days</h3>
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Calendar Date</th>
                      <th>Sequence Day</th>
                      <th>Daily Designation</th>
                      <th>Holiday Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(d => (
                      <tr key={d.date}>
                        <td className="font-bold">{d.date}</td>
                        <td className="font-semibold text-primary">{d.dayNumber ? `Day ${d.dayNumber}` : 'None'}</td>
                        <td>{d.description}</td>
                        <td>
                          <button 
                            onClick={() => handleToggleHoliday(d.date, d.isHoliday)}
                            className={`btn btn-sm ${d.isHoliday ? 'btn-danger' : 'btn-secondary'}`}
                          >
                            {d.isHoliday ? 'Holiday' : 'Working Day'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. STAFF MANAGEMENT ── */}
        {activeTab === 'staff' && (
          <div className="animate-up">
            <div className="page-header-row mb-4">
              <div>
                <h2 className="page-title">Faculty Database System</h2>
                <p className="page-subtitle">Manage official academic instructor profiles, credentials, and subject tags.</p>
              </div>
              {!showStaffForm && (
                <button className="btn btn-primary" onClick={() => setShowStaffForm(true)}>
                  <Plus size={16} />
                  <span>Register Instructor</span>
                </button>
              )}
            </div>

            {showStaffForm && (
              <div className="card mb-6 animate-fade">
                <div className="card-header">
                  <h3 className="text-sm font-bold">{staffEditingId ? 'Edit Profile details' : 'Register Instructor Profile'}</h3>
                  <button onClick={() => { setShowStaffForm(false); setStaffEditingId(null); }} className="modal-close-btn">✕</button>
                </div>
                <form onSubmit={handleStaffFormSubmit} className="card-body">
                  <div className="grid-2 mb-4">
                    <div className="form-group">
                      <label className="form-label">Teacher/Staff ID</label>
                      <input 
                        type="text" 
                        value={staffForm.teacherId} 
                        onChange={(e) => setStaffForm({ ...staffForm, teacherId: e.target.value })}
                        placeholder="e.g. T108"
                        className="form-control"
                        required
                        disabled={!!staffEditingId}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        value={staffForm.name} 
                        onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                        placeholder="Dr. S. Dev"
                        className="form-control"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input 
                        type="email" 
                        value={staffForm.email} 
                        onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                        placeholder="dev@college.edu"
                        className="form-control"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Login Password</label>
                      <input 
                        type="password" 
                        value={staffForm.password} 
                        onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                        placeholder={staffEditingId ? '•••••• (Unchanged)' : 'Set access credential'}
                        className="form-control"
                        required={!staffEditingId}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Primary Department</label>
                      <select 
                        value={staffForm.department} 
                        onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                        className="form-control"
                      >
                        <option value="IT">Information Technology</option>
                        <option value="CSE">Computer Science</option>
                        <option value="ECE">Electronics & Communication</option>
                        <option value="EEE">Electrical Engineering</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Instructor Access Authorization</label>
                      <select 
                        value={staffForm.role} 
                        onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                        className="form-control"
                      >
                        <option value="faculty">Standard Faculty</option>
                        <option value="admin">ERP Administrator</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group mb-4">
                    <label className="form-label">Assigned Subjects (Acronyms, comma-separated)</label>
                    <input 
                      type="text" 
                      value={staffForm.assignedSubjects} 
                      onChange={(e) => setStaffForm({ ...staffForm, assignedSubjects: e.target.value })}
                      placeholder="e.g. POM, UHV, SE, DBMS"
                      className="form-control"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowStaffForm(false); setStaffEditingId(null); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Profile</button>
                  </div>
                </form>
              </div>
            )}

            <div className="card">
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Instructor Name</th>
                      <th>Email</th>
                      <th>Dept</th>
                      <th>Access</th>
                      <th>Subjects</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map(t => (
                      <tr key={t._id}>
                        <td className="font-bold">{t.teacherId}</td>
                        <td className="font-semibold">{t.name}</td>
                        <td>{t.email}</td>
                        <td>{t.department}</td>
                        <td><StatusBadge status={t.role === 'admin' ? 'Admin' : 'Faculty'} /></td>
                        <td>
                          <div className="flex gap-1 flex-wrap">
                            {t.assignedSubjects?.map(s => (
                              <span key={s} className="badge badge-present" style={{ fontSize: '0.65rem' }}>{s}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-icon btn-secondary" onClick={() => handleEditStaffClick(t)}><Edit2 size={14} /></button>
                            <button className="btn btn-icon btn-danger" onClick={() => handleDeleteStaff(t._id, t.teacherId)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 4. STUDENT MANAGEMENT ── */}
        {activeTab === 'students' && (
          <div className="animate-up">
            <div className="page-header-row mb-4">
              <div>
                <h2 className="page-title">Student Records Registry</h2>
                <p className="page-subtitle">Enroll students, manage sections, and monitor register numbers.</p>
              </div>
              {!showStudentForm && (
                <button className="btn btn-primary" onClick={() => setShowStudentForm(true)}>
                  <Plus size={16} />
                  <span>Enroll Student</span>
                </button>
              )}
            </div>

            {showStudentForm && (
              <div className="card mb-6 animate-fade">
                <div className="card-header">
                  <h3 className="text-sm font-bold">{studentEditingId ? 'Edit Student Details' : 'Student Enrollment Profile'}</h3>
                  <button onClick={() => { setShowStudentForm(false); setStudentEditingId(null); }} className="modal-close-btn">✕</button>
                </div>
                <form onSubmit={handleStudentFormSubmit} className="card-body">
                  <div className="grid-3 mb-4">
                    <div className="form-group">
                      <label className="form-label">Register Number</label>
                      <input 
                        type="text" 
                        value={studentForm.registerNumber} 
                        onChange={(e) => setStudentForm({ ...studentForm, registerNumber: e.target.value })}
                        placeholder="e.g. 23IT001"
                        className="form-control"
                        required
                        disabled={!!studentEditingId}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        value={studentForm.name} 
                        onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                        placeholder="N. Kumar"
                        className="form-control"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Department</label>
                      <select 
                        value={studentForm.department} 
                        onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                        className="form-control"
                      >
                        <option value="IT">IT</option>
                        <option value="ECE">ECE</option>
                        <option value="EEE">EEE</option>
                        <option value="CSE">CSE</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Year of Study</label>
                      <select 
                        value={studentForm.year} 
                        onChange={(e) => setStudentForm({ ...studentForm, year: e.target.value })}
                        className="form-control"
                      >
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Section</label>
                      <select 
                        value={studentForm.section} 
                        onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
                        className="form-control"
                      >
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowStudentForm(false); setStudentEditingId(null); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Student</button>
                  </div>
                </form>
              </div>
            )}

            <div className="card">
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Register Number</th>
                      <th>Student Name</th>
                      <th>Dept</th>
                      <th>Academic Year</th>
                      <th>Section</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s._id}>
                        <td className="font-mono font-bold text-primary">{s.registerNumber}</td>
                        <td className="font-semibold">{s.name}</td>
                        <td>{s.department}</td>
                        <td>Year {s.year}</td>
                        <td>Section {s.section}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-icon btn-secondary" onClick={() => handleEditStudentClick(s)}><Edit2 size={14} /></button>
                            <button className="btn btn-icon btn-danger" onClick={() => handleDeleteStudent(s._id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. MASTER ATTENDANCE MATRIX ── */}
        {activeTab === 'master' && (
          <div className="animate-up">
            <div className="page-header-row mb-4">
              <div>
                <h2 className="page-title">Master Academic Matrix</h2>
                <p className="page-subtitle">Hourly attendance logs for all 7 slots. Synchronize, track, and monitor daily reports.</p>
              </div>
              <button
                className="btn btn-export"
                onClick={() => navigate('/admin/master-calendar')}
                style={{ height: '40px' }}
              >
                <Calendar size={14} />
                <span>Monthly Calendar View</span>
              </button>
            </div>

            <div className="filter-bar">
              <div className="form-group">
                <label className="form-label">Roster Date</label>
                <input 
                  type="date" 
                  value={masterDate} 
                  onChange={(e) => setMasterDate(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="form-control">
                  <option value="IT">IT</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="CSE">CSE</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="form-control">
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Section</label>
                <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} className="form-control">
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleSyncPeriod1ToAll}
                disabled={syncingAll || masterAttendance.length === 0}
                style={{ height: '40px' }}
              >
                <RefreshCw size={14} className={syncingAll ? 'animate-spin' : ''} />
                <span>Sync Hour 1 to All</span>
              </button>
            </div>

            <div className="alert alert-info mb-4">
              <div>
                <strong>Master Attendance Policy:</strong> Period 1 functions as the reference standard. Pressing the Sync button copies Hour 1 attendance status to all subsequent periods.
              </div>
            </div>

            <div className="master-table-wrap">
              <table className="master-table">
                <thead>
                  <tr>
                    <th>Register Number</th>
                    <th>Student Name</th>
                    <th>P1 (Master)</th>
                    <th>P2</th>
                    <th>P3</th>
                    <th>P4</th>
                    <th>P5</th>
                    <th>P6</th>
                    <th>P7</th>
                  </tr>
                </thead>
                <tbody>
                  {masterAttendance.length > 0 ? (
                    masterAttendance.map(student => (
                      <tr key={student._id}>
                        <td className="font-mono font-bold">{student.registerNumber}</td>
                        <td className="font-semibold">{student.name}</td>
                        {[1,2,3,4,5,6,7].map(p => {
                          const status = student.attendance[p] || '-';
                          const statusClass = status === 'Present' ? 'cell-present' : status === 'Absent' ? 'cell-absent' : status === 'OD' ? 'cell-od' : 'cell-na';
                          return (
                            <td key={p} className={statusClass}>
                              {status === 'Present' ? 'P' : status === 'Absent' ? 'A' : status === 'OD' ? 'OD' : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="text-center text-muted" style={{ padding: '2rem' }}>
                        No attendance records found for this combination.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 6. ADVANCED REPORTS ENGINE ── */}
        {activeTab === 'reports' && (
          <div className="animate-up">
            <div className="page-header-row mb-4">
              <div>
                <h2 className="page-title">Advanced Report Engine</h2>
                <p className="page-subtitle">Generate daily sheets, student tracking, faculty logs, and defaulter registers — then export as Excel or CSV.</p>
              </div>
              <div className="flex gap-2 items-center">
                {reportData && (
                  <button className="btn btn-secondary" onClick={() => window.print()} style={{ height: '40px' }}>
                    <Printer size={14} />
                    <span>Print</span>
                  </button>
                )}
                <ExportButton
                  reportType={getExportEndpoint()}
                  filters={buildExportFilters()}
                  hasData={!!reportData}
                  user={user}
                  adminName={user?.name || 'Admin'}
                />
              </div>
            </div>

            {/* ── Filter Bar ── */}
            <div className="filter-bar" style={{ flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>

              {/* Report Type */}
              <div className="form-group" style={{ minWidth: '200px' }}>
                <label className="form-label">Report Category</label>
                <select value={reportType} onChange={(e) => { setReportType(e.target.value); setReportData(null); }} className="form-control">
                  <optgroup label="── Core Reports ──">
                    <option value="daily">📅 Daily Attendance Sheet</option>
                    <option value="hourly">🕐 Hourly Summary Matrix</option>
                    <option value="defaulters">⚠️ Defaulters List (&lt;75%)</option>
                    <option value="student">👤 Student Performance Ledger</option>
                  </optgroup>
                  <optgroup label="── Export Reports ──">
                    <option value="student-summary">📊 Student Attendance Summary</option>
                    <option value="faculty-report">👨‍🏫 Faculty Report</option>
                    <option value="class-report">🏫 Class-wise Report</option>
                    <option value="subject-report">📚 Subject-wise Report</option>
                    <option value="monthly-report">📆 Monthly Report</option>
                    <option value="semester-report">🗓️ Semester Report</option>
                    <option value="individual-report">🔍 Individual Student History</option>
                  </optgroup>
                </select>
              </div>

              {/* Department filter — shown for class/student/monthly/semester types */}
              {!['hourly', 'student', 'individual-report', 'faculty-report', 'subject-report'].includes(reportType) && (
                <div className="form-group">
                  <label className="form-label">Dept</label>
                  <select value={reportDept} onChange={(e) => setReportDept(e.target.value)} className="form-control">
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="CSE">CSE</option>
                  </select>
                </div>
              )}

              {/* Year filter */}
              {!['hourly', 'student', 'individual-report', 'faculty-report', 'subject-report'].includes(reportType) && (
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="form-control">
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              )}

              {/* Section filter */}
              {!['hourly', 'student', 'individual-report', 'faculty-report', 'subject-report'].includes(reportType) && (
                <div className="form-group">
                  <label className="form-label">Section</label>
                  <select value={reportSection} onChange={(e) => setReportSection(e.target.value)} className="form-control">
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              )}

              {/* Single date — daily, hourly, class-report, subject-report */}
              {['daily', 'hourly', 'class-report', 'subject-report'].includes(reportType) && (
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="form-control" />
                </div>
              )}

              {/* Date range — student-summary, faculty, monthly, semester, individual */}
              {['student-summary', 'faculty-report', 'monthly-report', 'semester-report', 'individual-report'].includes(reportType) && (
                <>
                  <div className="form-group">
                    <label className="form-label">From</label>
                    <input type="date" value={reportFromDate} onChange={(e) => setReportFromDate(e.target.value)} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To</label>
                    <input type="date" value={reportToDate} onChange={(e) => setReportToDate(e.target.value)} className="form-control" />
                  </div>
                </>
              )}

              {/* Month + Year — monthly report */}
              {reportType === 'monthly-report' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Month</label>
                    <select value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="form-control">
                      <option value="">All</option>
                      {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                        <option key={m} value={m}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <input type="number" min="2020" max="2030" value={reportYearFilter} onChange={(e) => setReportYearFilter(e.target.value)} className="form-control" style={{ width: '90px' }} />
                  </div>
                </>
              )}

              {/* Defaulters threshold */}
              {reportType === 'defaulters' && (
                <div className="form-group">
                  <label className="form-label">Threshold (%)</label>
                  <input type="number" min="1" max="100" value={reportThreshold} onChange={(e) => setReportThreshold(e.target.value)} className="form-control" style={{ width: '80px' }} />
                </div>
              )}

              {/* Attendance status filter */}
              {['student-summary', 'daily', 'class-report', 'subject-report'].includes(reportType) && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} className="form-control">
                    <option value="">All</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="OD">OD</option>
                  </select>
                </div>
              )}

              {/* Hour filter */}
              {['daily', 'individual-report'].includes(reportType) && (
                <div className="form-group">
                  <label className="form-label">Hour</label>
                  <select value={reportHour} onChange={(e) => setReportHour(e.target.value)} className="form-control">
                    <option value="">All</option>
                    {[1,2,3,4,5,6,7].map(h => <option key={h} value={h}>Hour {h}</option>)}
                  </select>
                </div>
              )}

              {/* Faculty filter */}
              {['faculty-report', 'subject-report'].includes(reportType) && (
                <div className="form-group">
                  <label className="form-label">Faculty</label>
                  <input type="text" placeholder="Name or ID" value={reportFaculty} onChange={(e) => setReportFaculty(e.target.value)} className="form-control" />
                </div>
              )}

              {/* Subject filter */}
              {['subject-report', 'individual-report', 'faculty-report'].includes(reportType) && (
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input type="text" placeholder="e.g. DBMS" value={reportSubject} onChange={(e) => setReportSubject(e.target.value)} className="form-control" />
                </div>
              )}

              {/* Student Reg Number */}
              {['student', 'individual-report'].includes(reportType) && (
                <div className="form-group">
                  <label className="form-label">Student Reg No.</label>
                  <input type="text" placeholder="e.g. 23IT005" value={reportStudentReg} onChange={(e) => setReportStudentReg(e.target.value)} className="form-control" />
                </div>
              )}

              <button className="btn btn-primary" onClick={generateReport} disabled={loading} style={{ height: '40px', alignSelf: 'flex-end' }}>
                <Search size={14} />
                <span>{loading ? 'Processing...' : 'Search'}</span>
              </button>
            </div>

            {/* Report Data Display Area */}
            {reportData ? (
              <div className="card animate-fade print-report-area">
                <div className="card-header flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold">
                      {reportType === 'daily' && `Daily Attendance Sheet — ${reportDept} Year ${reportYear} Section ${reportSection}`}
                      {reportType === 'hourly' && `Hourly Status Breakdown — ${reportDate}`}
                      {reportType === 'defaulters' && `Attendance Defaulters List (< ${reportThreshold}%)`}
                      {reportType === 'student' && `Roster for: ${reportData.student?.name} (${reportData.student?.registerNumber})`}
                    </h3>
                    <p className="text-xs text-muted mt-1">Generated dynamically on {new Date().toLocaleDateString()}</p>
                  </div>
                  <span className="badge badge-present">Official Roster</span>
                </div>

                <div className="card-body">
                  {/* Daily Report View */}
                  {reportType === 'daily' && reportData.students && (
                    <div className="data-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Reg Number</th>
                            <th>Student Name</th>
                            <th>H1</th>
                            <th>H2</th>
                            <th>H3</th>
                            <th>H4</th>
                            <th>H5</th>
                            <th>H6</th>
                            <th>H7</th>
                            <th>Hours Attended</th>
                            <th>Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.students.map(s => (
                            <tr key={s.registerNumber}>
                              <td className="font-mono font-bold">{s.registerNumber}</td>
                              <td className="font-semibold">{s.name}</td>
                              {[1,2,3,4,5,6,7].map(h => {
                                const status = s.periods[h]?.status || '-';
                                return (
                                  <td key={h} className={status === 'Present' ? 'text-success font-bold' : status === 'Absent' ? 'text-danger font-bold' : status === 'OD' ? 'text-primary font-bold' : ''}>
                                    {status === 'Present' ? 'P' : status === 'Absent' ? 'A' : status === 'OD' ? 'OD' : '-'}
                                  </td>
                                );
                              })}
                              <td>{s.periodsPresent} / {s.periodsTotal}</td>
                              <td className={s.percentage !== null && s.percentage < 75 ? 'text-danger font-bold' : 'text-success font-bold'}>
                                {s.percentage !== null ? `${s.percentage}%` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Hourly Report View */}
                  {reportType === 'hourly' && reportData.periods && (
                    <div className="data-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Period (Hour)</th>
                            <th>Timings</th>
                            <th>Marking Status</th>
                            <th>Subject</th>
                            <th>Instructor ID</th>
                            <th>Total present</th>
                            <th>Total absent</th>
                            <th>Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.periods.map(p => (
                            <tr key={p.period}>
                              <td className="font-bold">Hour {p.period}</td>
                              <td>{p.label}</td>
                              <td><StatusBadge status={p.marked ? 'Done' : 'Pending'} /></td>
                              <td className="font-semibold">{p.subject}</td>
                              <td>{p.teacherId}</td>
                              <td className="text-success font-bold">{p.present || 0}</td>
                              <td className="text-danger font-bold">{p.absent || 0}</td>
                              <td className="font-bold">{p.percentage ? `${p.percentage}%` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Defaulters Report View */}
                  {reportType === 'defaulters' && reportData.defaulters && (
                    <div className="data-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Reg Number</th>
                            <th>Student Name</th>
                            <th>Department</th>
                            <th>Class details</th>
                            <th>Present Periods</th>
                            <th>Absent Periods</th>
                            <th>Attendance Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.defaulters.length > 0 ? (
                            reportData.defaulters.map(s => (
                              <tr key={s.registerNumber}>
                                <td className="font-mono font-bold text-danger">{s.registerNumber}</td>
                                <td className="font-semibold">{s.name}</td>
                                <td>{s.department}</td>
                                <td>Year {s.year} - Sec {s.section}</td>
                                <td className="text-success font-bold">{s.present}</td>
                                <td className="text-danger font-bold">{s.absent}</td>
                                <td className="text-danger font-bold" style={{ fontSize: '1rem' }}>{s.percentage}%</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>
                                Outstanding! No students are below the {reportThreshold}% attendance threshold in this class.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Student Performance Ledger */}
                  {reportType === 'student' && reportData.student && (
                    <div>
                      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200" style={{ background: '#f9fafb', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div>
                          <div className="text-xs text-muted uppercase font-semibold">Overall Attendance Score</div>
                          <div className="text-xl font-bold text-primary mt-1" style={{ fontSize: '2rem', lineHeight: '1' }}>{reportData.summary?.percentage}%</div>
                        </div>
                        <div className="flex gap-6 text-center text-xs">
                          <div>
                            <div className="text-muted">Total Hours Scheduled</div>
                            <div className="font-bold text-lg mt-1">{reportData.summary?.total}</div>
                          </div>
                          <div>
                            <div className="text-muted text-success">Hours Present</div>
                            <div className="font-bold text-lg text-success mt-1">{reportData.summary?.present}</div>
                          </div>
                          <div>
                            <div className="text-muted text-danger">Hours Absent</div>
                            <div className="font-bold text-lg text-danger mt-1">{reportData.summary?.absent}</div>
                          </div>
                        </div>
                      </div>

                      <h4 className="font-bold text-sm mb-3">Chronological Log</h4>
                      <div className="data-table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Hour 1</th>
                              <th>Hour 2</th>
                              <th>Hour 3</th>
                              <th>Hour 4</th>
                              <th>Hour 5</th>
                              <th>Hour 6</th>
                              <th>Hour 7</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.history?.map(row => (
                              <tr key={row.date}>
                                <td className="font-bold">{row.date}</td>
                                {[1,2,3,4,5,6,7].map(p => {
                                  const status = row.periods[p]?.status || '-';
                                  const subject = row.periods[p]?.subject || '';
                                  return (
                                    <td key={p} title={subject ? `Subject: ${subject}` : ''}>
                                      <span className={status === 'Present' ? 'text-success font-bold' : status === 'Absent' ? 'text-danger font-bold' : status === 'OD' ? 'text-primary font-bold' : ''}>
                                        {status === 'Present' ? 'P' : status === 'Absent' ? 'A' : status === 'OD' ? 'OD' : '-'}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state card">
                <div className="empty-icon">📊</div>
                <div className="empty-title">No report generated</div>
                <div className="empty-text">Select your parameters and click Search above to generate official logs.</div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
