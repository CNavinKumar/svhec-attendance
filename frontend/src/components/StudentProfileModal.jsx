import React, { useEffect, useState } from 'react';
import { X, Mail, Phone, Calendar, Download, RefreshCw, Award, PieChart } from 'lucide-react';
import { API_BASE } from '../config';

const StudentProfileModal = ({ studentReg, onClose, user }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE}/api/reports?type=student&studentReg=${studentReg}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch student details');
        const data = await res.json();
        setProfileData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (studentReg) {
      fetchStudentProfile();
    }
  }, [studentReg, user]);

  const handleDownload = () => {
    // Generate individual report download
    const url = `${API_BASE}/api/export?type=daily&studentReg=${studentReg}&format=excel`;
    const a = document.createElement('a');
    a.href = url;
    a.headers = { Authorization: `Bearer ${user.token}` };
    window.open(url, '_blank');
  };

  if (!studentReg) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(8px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="glass-panel animate-up" style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '640px',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, var(--clr-primary-50, #f1f8f1) 0%, #ffffff 100%)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--clr-gray-900, #111827)' }}>
            Student Dossier Profile
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.2s'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto', maxHeight: '70vh' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw size={32} className="export-spin" style={{ color: 'var(--clr-primary-700, #256427)', margin: '0 auto 16px' }} />
              <p style={{ color: '#64748b', fontSize: '13px' }}>Loading student file...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger" style={{ fontSize: '13px' }}>
              {error}
            </div>
          )}

          {profileData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Bio Grid */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <img 
                  src={profileData.student?.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
                  alt="Student avatar"
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '16px',
                    objectFit: 'cover',
                    border: '3px solid var(--clr-primary-100, #e8f5e9)'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h4 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
                    {profileData.student?.name}
                  </h4>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
                    Reg No: <span style={{ color: 'var(--clr-primary-700, #256427)', fontFamily: 'monospace' }}>{profileData.student?.registerNumber}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {profileData.student?.department} Dept · Year {profileData.student?.year} · Section {profileData.student?.section}
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                  <Calendar size={18} style={{ color: 'var(--clr-primary-700, #256427)', margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{profileData.summary?.total}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', marginTop: '2px' }}>Hours Total</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #dcfce7', textAlign: 'center' }}>
                  <Award size={18} style={{ color: '#16a34a', margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#14532d' }}>{profileData.summary?.present}</div>
                  <div style={{ fontSize: '10px', color: '#15803d', textTransform: 'uppercase', fontWeight: '600', marginTop: '2px' }}>Hours Present</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', background: '#fff1f2', border: '1px solid #ffe4e6', textAlign: 'center' }}>
                  <PieChart size={18} style={{ color: '#dc2626', margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#9f1239' }}>{profileData.summary?.percentage}%</div>
                  <div style={{ fontSize: '10px', color: '#be123c', textTransform: 'uppercase', fontWeight: '600', marginTop: '2px' }}>Average Pct</div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="card" style={{ border: '1px solid #f1f5f9', padding: '16px', borderRadius: '12px' }}>
                <h5 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>Contact Details</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Mail size={14} style={{ color: '#64748b' }} />
                    <span>{profileData.student?.email || 'abishek@college.edu'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Phone size={14} style={{ color: '#64748b' }} />
                    <span>{profileData.student?.phone || '+91 98765 43210'}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={onClose}>Close File</button>
                <button className="btn btn-primary" onClick={handleDownload} style={{ gap: '6px' }}>
                  <Download size={14} />
                  <span>Download Report</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfileModal;
