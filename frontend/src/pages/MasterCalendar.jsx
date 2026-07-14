import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE } from '../config';
import { useToast } from '../context/ToastContext';
import DateTimeBanner from '../components/DateTimeBanner';
import StudentProfileModal from '../components/StudentProfileModal';
import {
  ChevronLeft, ChevronRight, Download, RefreshCw, ArrowLeft,
  Calendar, Users, CheckCircle, XCircle, Clock, FileText, Search,
  Printer, ArrowUpDown, ChevronDown
} from 'lucide-react';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const PERIOD_LABELS = {
  1:'09:05–09:55', 2:'09:55–10:45', 3:'11:00–11:50',
  4:'11:50–12:40', 5:'01:40–02:30', 6:'02:30–03:20', 7:'03:35–04:25'
};

const STATUS_MAP = {
  Present: { abbr: 'P', cls: 'mca-p' },
  Absent:  { abbr: 'A', cls: 'mca-a' },
  OD:      { abbr: 'OD', cls: 'mca-od' },
  Late:    { abbr: 'L', cls: 'mca-l' },
  'Medical Leave': { abbr: 'ML', cls: 'mca-ml' },
  Holiday: { abbr: 'H', cls: 'mca-holiday' },
  '-':     { abbr: '–', cls: 'mca-dash' }
};

const pad2 = n => String(n).padStart(2, '0');
const toDateStr = (year, month, day) => `${year}-${pad2(month + 1)}-${pad2(day)}`;

const buildCalendarGrid = (year, month) => {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const MasterCalendar = ({ user }) => {
  const navigate = useNavigate();
  const toast = useToast();

  // Filters
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [filterDept, setFilterDept] = useState('IT');
  const [filterYear, setFilterYear] = useState('4');
  const [filterSection, setFilterSection] = useState('A');

  // Roster detailed filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [hourFilter, setHourFilter] = useState('All');
  const [sortBy, setSortBy] = useState('registerNumber');
  const [sortOrder, setSortOrder] = useState('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Selected Student Profile Modal
  const [selectedStudentReg, setSelectedStudentReg] = useState(null);

  // Master monthly summaries (Fetched in single optimized API call)
  const [monthSummaries, setMonthSummaries] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(true);

  // Detailed selected day attendance
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const calendarGrid = buildCalendarGrid(calYear, calMonth);
  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

  // ── 1. Fetch Month Summaries (Optimized Endpoint) ─────────────────────────
  const fetchMonthSummaries = async () => {
    setLoadingMonth(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/master-attendance/month?month=${calMonth + 1}&year=${calYear}&department=${filterDept}&yearOfStudy=${filterYear}&section=${filterSection}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      if (!res.ok) throw new Error('Failed to load month summaries');
      const data = await res.json();
      setMonthSummaries(data.summaries || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingMonth(false);
    }
  };

  // ── 2. Fetch Day Detail (On Day Cell Click) ──────────────────────────────
  const fetchDayDetail = async (dateStr) => {
    setSelectedDate(dateStr);
    setLoadingDetail(true);
    setDayDetail(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/master-attendance/day?date=${dateStr}&department=${filterDept}&yearOfStudy=${filterYear}&section=${filterSection}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      if (!res.ok) throw new Error('Failed to load day details');
      const data = await res.json();
      setDayDetail(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── 3. Real-Time Socket Connection ───────────────────────────────────────
  useEffect(() => {
    const socket = io(API_BASE);

    socket.emit('join_room', 'attendance_updates');

    // Live refresh when attendance updates happen
    socket.on('attendance_updated', (data) => {
      toast.info(`Live attendance update logged for ${data.date || ''}`);
      fetchMonthSummaries();
      if (selectedDate && data.date === selectedDate) {
        fetchDayDetail(selectedDate);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedDate, calMonth, calYear, filterDept, filterYear, filterSection]);

  // Preload month data
  useEffect(() => {
    fetchMonthSummaries();
    setSelectedDate(null);
    setDayDetail(null);
  }, [calYear, calMonth, filterDept, filterYear, filterSection]);

  // Navigate months
  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // ── 4. Excel & CSV Exports ───────────────────────────────────────────────
  const handleExport = (format) => {
    if (!selectedDate) {
      toast.warning('Please select a date to export first.');
      return;
    }
    const url = `${API_BASE}/api/export?type=daily&date=${selectedDate}&department=${filterDept}&year=${filterYear}&section=${filterSection}&format=${format}`;
    window.open(url, '_blank');
    toast.success(`Generating ${format.toUpperCase()} report...`);
  };

  // ── 5. Filtering and Sorting logic ───────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!dayDetail || !dayDetail.students) return [];

    let list = [...dayDetail.students];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.registerNumber.toLowerCase().includes(q)
      );
    }

    // Attendance status filter
    if (statusFilter !== 'All') {
      list = list.filter(s => {
        return Object.values(s.attendance || {}).includes(statusFilter);
      });
    }

    // Hour period filter
    if (hourFilter !== 'All') {
      list = list.filter(s => s.attendance?.[hourFilter] !== '-');
    }

    // Sorting
    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'percentage') {
        valA = a.percentage || 0;
        valB = b.percentage || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [dayDetail, searchQuery, statusFilter, hourFilter, sortBy, sortOrder]);

  // Paginated List
  const paginatedStudents = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredStudents.slice(startIndex, startIndex + pageSize);
  }, [filteredStudents, page]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // ── 6. Render Day Cell Color Coding ──────────────────────────────────────
  const renderDayCell = (day) => {
    if (!day) return <div key={`empty-${Math.random()}`} className="mca-cell mca-cell-empty" />;

    const ds = toDateStr(calYear, calMonth, day);
    const dayData = monthSummaries.find(s => s.date === ds);
    const isToday = ds === todayStr;
    const isSelected = ds === selectedDate;

    let cellClass = '';
    let pctBadge = '';

    if (dayData) {
      if (dayData.isHoliday) {
        cellClass = 'mca-cell-holiday';
      } else if (dayData.percentage !== null) {
        const pct = dayData.percentage;
        pctBadge = `${pct}%`;
        if (pct >= 90) cellClass = 'mca-cell-green';
        else if (pct >= 75) cellClass = 'mca-cell-yellow';
        else cellClass = 'mca-cell-red';
      }
    }

    if (isToday) cellClass = 'mca-cell-blue';
    if (isSelected) cellClass = 'mca-cell-purple';

    return (
      <div
        key={ds}
        className={`mca-cell mca-cell-clickable ${cellClass}`}
        onClick={() => fetchDayDetail(ds)}
        style={{ position: 'relative' }}
      >
        <span className="mca-day-num">{day}</span>
        {pctBadge && <span className="mca-day-pct">{pctBadge}</span>}
        {dayData?.isHoliday && <span className="mca-day-holiday-lbl">HOL</span>}
      </div>
    );
  };

  return (
    <div className="mca-layout animate-fade-in" style={{ padding: '1.5rem 1rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn btn-icon btn-secondary" onClick={() => navigate('/admin')} title="Back to Admin">
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--clr-gray-900)' }}>
              Monthly Master Roster
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--clr-gray-500)' }}>
              Color-coded calendar grid details. Select a cell to display active student rosters.
            </p>
          </div>
        </div>
      </div>

      <DateTimeBanner />

      {/* Roster Filters */}
      <div className="card mb-6" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)' }}>
        <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="form-control">
              <option value="IT">IT</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Year</label>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="form-control">
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Section</label>
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className="form-control">
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          <div className="form-group" style={{ marginLeft: 'auto' }}>
            <label className="form-label">Calendar Navigation</label>
            <div className="flex gap-2 items-center">
              <button className="btn btn-icon btn-secondary" onClick={prevMonth}><ChevronLeft size={16} /></button>
              <span style={{ fontWeight: '700', minWidth: '120px', textAlign: 'center' }}>
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button className="btn btn-icon btn-secondary" onClick={nextMonth}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Roster Container */}
      <div className="mca-main" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px' }}>
        
        {/* Left Side: Calendar Grid */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="mca-dow-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px' }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ fontSize: '12px', fontWeight: 'bold', color: d === 'Sun' ? '#ef4444' : '#64748b' }}>{d}</div>
            ))}
          </div>
          <div className="mca-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {calendarGrid.map((day, i) => renderDayCell(day))}
          </div>

          {/* Color Legend */}
          <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#86efac' }} /><span>&gt;90%</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fef08a' }} /><span>75-90%</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fca5a5' }} /><span>&lt;75%</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#94a3b8' }} /><span>Holiday</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#93c5fd' }} /><span>Today</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#c084fc' }} /><span>Selected</span></div>
          </div>
        </div>

        {/* Right Side: Day Details & Student Table */}
        <div className="card">
          {!selectedDate ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: '#94a3b8' }}>
              <Calendar size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p>Select a calendar day cell to load full attendance registers.</p>
            </div>
          ) : loadingDetail ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
              <RefreshCw className="export-spin" size={32} style={{ color: 'var(--clr-primary-700)', marginBottom: '12px' }} />
              <p>Loading roster information...</p>
            </div>
          ) : dayDetail ? (
            <div>
              {/* Day Header Panel */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--clr-gray-900)' }}>
                    Roster for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--clr-gray-500)' }}>
                    Dept: {filterDept} · Year {filterYear} · Sec {filterSection}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExport('excel')}><Download size={13} /> Excel</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExport('pdf')}><Printer size={13} /> PDF</button>
                </div>
              </div>

              {/* Table search & quick filter controls */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search by name/register..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="form-control"
                    style={{ paddingLeft: '32px', height: '36px', fontSize: '12px' }}
                  />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-control" style={{ width: '120px', height: '36px', fontSize: '12px' }}>
                  <option value="All">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="OD">OD</option>
                  <option value="Late">Late</option>
                </select>
                <select value={hourFilter} onChange={e => setHourFilter(e.target.value)} className="form-control" style={{ width: '110px', height: '36px', fontSize: '12px' }}>
                  <option value="All">All Hours</option>
                  <option value="1">Hour 1</option>
                  <option value="2">Hour 2</option>
                  <option value="3">Hour 3</option>
                  <option value="4">Hour 4</option>
                  <option value="5">Hour 5</option>
                  <option value="6">Hour 6</option>
                  <option value="7">Hour 7</option>
                </select>
              </div>

              {/* Student Table */}
              <div className="data-table-wrap" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#ffffff' }}>
                    <tr>
                      <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('registerNumber')}>Reg Number <ArrowUpDown size={10} /></th>
                      <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('name')}>Student Name <ArrowUpDown size={10} /></th>
                      <th>H1</th>
                      <th>H2</th>
                      <th>H3</th>
                      <th>H4</th>
                      <th>H5</th>
                      <th>H6</th>
                      <th>H7</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('percentage')}>Pct <ArrowUpDown size={10} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.length > 0 ? (
                      paginatedStudents.map(student => {
                        const statusClass = (st) => {
                          if (st === 'Present') return 'text-success font-bold';
                          if (st === 'Absent') return 'text-danger font-bold';
                          if (st === 'OD') return 'text-primary font-bold';
                          if (st === 'Late') return 'text-warning font-bold';
                          return 'text-muted';
                        };

                        return (
                          <tr key={student._id}>
                            <td className="font-mono font-bold" style={{ fontSize: '11px' }}>{student.registerNumber}</td>
                            <td 
                              style={{ fontWeight: 600, color: 'var(--clr-primary-700)', cursor: 'pointer' }}
                              onClick={() => setSelectedStudentReg(student.registerNumber)}
                              title="Click to view file dossier"
                            >
                              {student.name}
                            </td>
                            {[1,2,3,4,5,6,7].map(p => {
                              const st = student.attendance?.[p] || '-';
                              const map = STATUS_MAP[st] || STATUS_MAP['-'];
                              return (
                                <td key={p} className={statusClass(st)} style={{ fontSize: '11px' }}>
                                  {map.abbr}
                                </td>
                              );
                            })}
                            <td style={{
                              fontWeight: 'bold',
                              color: student.percentage !== null && student.percentage < 75 ? '#ef4444' : '#22c55e'
                            }}>
                              {student.percentage !== null ? `${student.percentage}%` : '–'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                          No students matching filters found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
                  <span>Showing page {page} of {totalPages}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(p - 1, 1))}
                    >
                      Previous
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: '#94a3b8' }}>
              <Clock size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p>Roster details unavailable for this date.</p>
            </div>
          )}
        </div>

      </div>

      {/* Student Profile Modal popup */}
      {selectedStudentReg && (
        <StudentProfileModal 
          studentReg={selectedStudentReg}
          onClose={() => setSelectedStudentReg(null)}
          user={user}
        />
      )}
    </div>
  );
};

export default MasterCalendar;
