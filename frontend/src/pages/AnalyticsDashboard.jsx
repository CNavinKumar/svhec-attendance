import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell } from 'recharts';
import { API_BASE } from '../config';
import { useToast } from '../context/ToastContext';
import { Calendar, Award, BookOpen, Users, TrendingUp, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateTimeBanner from '../components/DateTimeBanner';

// Mock data generator for analytics trends
const generateTrendsData = () => {
  return [
    { name: 'Mon', Present: 92, Absent: 8, threshold: 75 },
    { name: 'Tue', Present: 88, Absent: 12, threshold: 75 },
    { name: 'Wed', Present: 94, Absent: 6, threshold: 75 },
    { name: 'Thu', Present: 73, Absent: 27, threshold: 75 },
    { name: 'Fri', Present: 91, Absent: 9, threshold: 75 },
    { name: 'Sat', Present: 85, Absent: 15, threshold: 75 }
  ];
};

const subjectData = [
  { name: 'DBMS', percentage: 91 },
  { name: 'IOT', percentage: 84 },
  { name: 'UHV2', percentage: 71 },
  { name: 'POM', percentage: 95 },
  { name: 'RES', percentage: 88 }
];

const facultyData = [
  { name: 'Dr. Dev', percentage: 94 },
  { name: 'Ms. Chitra', percentage: 88 },
  { name: 'Dr. Suresh', percentage: 73 },
  { name: 'Mr. Manoj', percentage: 91 }
];

const pad2 = n => String(n).padStart(2, '0');

const AnalyticsDashboard = ({ user }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [trends, setTrends] = useState(generateTrendsData());
  const [loading, setLoading] = useState(false);
  const [heatMapYear, setHeatMapYear] = useState(2026);
  const [heatMapMonth, setHeatMapMonth] = useState(7); // July

  // Fetch heatmap metrics dynamically
  const [monthlyMasterData, setMonthlyMasterData] = useState([]);
  const [masterLoading, setMasterLoading] = useState(true);

  useEffect(() => {
    const fetchMonthlySummary = async () => {
      try {
        setMasterLoading(true);
        const res = await fetch(
          `${API_BASE}/api/admin/master-attendance/month?month=${heatMapMonth}&year=${heatMapYear}&department=IT&yearOfStudy=4&section=A`,
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setMonthlyMasterData(data.summaries || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setMasterLoading(false);
      }
    };

    fetchMonthlySummary();
  }, [heatMapYear, heatMapMonth, user]);

  return (
    <div style={{ padding: '1.5rem 1rem', minWidth: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn btn-icon btn-secondary" onClick={() => navigate('/admin')} title="Back to Admin">
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--clr-gray-900, #111827)' }}>
              Enterprise Attendance Analytics
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--clr-gray-500, #6b7280)' }}>
              Interactive dashboards, comparisons, and GitHub-style heatmap indicators
            </p>
          </div>
        </div>
      </div>

      <DateTimeBanner />

      {/* Grid 2x2 for charts */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        
        {/* Daily Attendance Trend Line Chart */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--clr-gray-900)' }}>
              Weekly Attendance Trend (%)
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--clr-gray-400)' }}>Roster baseline: 75%</span>
          </div>
          <div className="card-body" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="Present" stroke="var(--clr-primary-700, #256427)" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="threshold" stroke="#be123c" strokeWidth={1} strokeDasharray="5 5" name="Min Roster" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject wise attendance bar chart */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--clr-gray-900)' }}>
              Subject-wise Average Attendance
            </h3>
          </div>
          <div className="card-body" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="percentage" fill="var(--clr-primary-400, #43a047)" radius={[6, 6, 0, 0]}>
                  {subjectData.map((entry, index) => {
                    const color = entry.percentage < 75 ? '#e11d48' : entry.percentage > 90 ? 'var(--clr-primary-700, #256427)' : 'var(--clr-primary-400, #43a047)';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Faculty wise performance comparison */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--clr-gray-900)' }}>
              Faculty Roster Submission Index
            </h3>
          </div>
          <div className="card-body" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facultyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} />
                <Tooltip />
                <Bar dataKey="percentage" fill="var(--clr-primary-600, #2e7d32)" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GitHub Style Heatmap Grid */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--clr-gray-900)' }}>
                Roster Activity Map
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--clr-gray-400)', marginTop: '2px' }}>
                July 2026 Grid Summary (IT - 4th Year)
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setHeatMapMonth(m => m === 1 ? 12 : m - 1)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ◀
              </button>
              <span style={{ fontSize: '12px', fontWeight: '700' }}>Month {heatMapMonth}</span>
              <button 
                onClick={() => setHeatMapMonth(m => m === 12 ? 1 : m + 1)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ▶
              </button>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            {masterLoading ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
                <span className="animate-pulse">Loading Map...</span>
              </div>
            ) : (
              <div>
                {/* Heatmap Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 1fr)', 
                  gap: '8px', 
                  maxWidth: '300px', 
                  margin: '0 auto' 
                }}>
                  {monthlyMasterData.map((d, index) => {
                    const dayNum = index + 1;
                    let color = '#e2e8f0'; // empty/no data
                    if (d.isHoliday) {
                      color = '#94a3b8'; // grey holiday
                    } else if (d.percentage !== null) {
                      color = d.percentage < 75 ? '#fca5a5' : d.percentage > 90 ? '#86efac' : '#fef08a'; // red/green/yellow
                    }
                    return (
                      <div 
                        key={d.date}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          backgroundColor: color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: d.isHoliday || d.percentage !== null ? '#1e293b' : '#94a3b8',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                        title={`${d.date} - ${d.isHoliday ? 'Holiday' : d.percentage !== null ? `${d.percentage}%` : 'No Marks'}`}
                      />
                    );
                  })}
                </div>

                {/* Heatmap Legend */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '12px', 
                  fontSize: '11px', 
                  color: '#64748b',
                  marginTop: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#e2e8f0' }} />
                    <span>No data</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#94a3b8' }} />
                    <span>Holiday</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fca5a5' }} />
                    <span>&lt;75%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fef08a' }} />
                    <span>75-90%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#86efac' }} />
                    <span>&gt;90%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsDashboard;
