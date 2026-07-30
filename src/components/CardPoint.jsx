import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserCheck, Scale, Sparkles } from 'lucide-react';

// CardPoint component – shown at the top of the Home page
const CardPoint = ({ userData, theme }) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const cardBg = isDark ? '#2D1D13' : '#FFFFFF';
  const cardBorder = isDark ? '#4A2E1E' : '#FEF08A';
  const shadow = isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FEF08A, 0 10px 15px rgba(250, 204, 21, 0.05)';
  const titleColor = isDark ? '#FFFFFF' : '#1F2937';
  const descColor = isDark ? '#D1D5DB' : '#6B7280';
  
  const trophyBg = isDark ? '#3D291C' : '#FEF9C3';
  const trophyBorder = isDark ? '#F97316' : '#F59E0B';
  const labelColor = isDark ? '#9CA3AF' : '#6B7280';
  const dashBorder = isDark ? '2px dashed #4A2E1E' : '2px dashed #FEF08A';

  return (
    <div style={{
      backgroundColor: cardBg,
      borderRadius: '24px',
      padding: '24px',
      border: `2px solid ${cardBorder}`,
      boxShadow: shadow,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      marginBottom: '24px',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: titleColor }}>Skor Poin Asrama</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: descColor, fontWeight: 600 }}>Poin kelayakan huni kamu</p>
        </div>
        {/* Trophy badge */}
        <div style={{
          backgroundColor: trophyBg,
          padding: '12px',
          borderRadius: '20px',
          border: `2px solid ${trophyBorder}`,
          boxShadow: `0 3px 0 ${isDark ? '#4A2E1E' : '#F59E0B'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F59E0B',
          transition: 'all 0.3s'
        }}>
          <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🏆</span>
        </div>
      </div>

      {/* Point value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{
          fontSize: '2.5rem',
          fontWeight: 900,
          color: (userData?.point ?? 0) >= 0 ? '#10B981' : '#EF4444',
          fontFamily: '"Nunito", "Inter", sans-serif'
        }}>
          {userData?.point ?? 0}
        </span>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: labelColor }}>Poin</span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={() => navigate('/see-points')}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#F59E0B',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 0 #D97706',
            transition: 'transform 0.1s, box-shadow 0.1s',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 0px 0 #D97706'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #D97706'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #D97706'; }}
        >
          <span>🔍 Lihat Point2</span>
        </button>
        {/* Staff‑only buttons – rendered conditionally in Home */}
        {(userData?.jabatan?.toLowerCase() === 'kepenghunian' || userData?.jabatan?.toLowerCase() === 'proteksi') && (
          <div style={{
            marginTop: '8px',
            borderTop: dashBorder,
            paddingTop: '12px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
          }}>
            <button
              onClick={() => navigate('/create-point')}
              style={{
                padding: '12px',
                backgroundColor: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 0 #059669',
                transition: 'transform 0.1s, box-shadow 0.1s',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 0px 0 #059669'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #059669'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #059669'; }}
            >
              <span>➕ Buat Jenis Poin</span>
            </button>
            <button
              onClick={() => navigate('/penghakiman-point')}
              style={{
                padding: '12px',
                backgroundColor: '#EF4444',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 0 #DC2626',
                transition: 'transform 0.1s, box-shadow 0.1s',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 0px 0 #DC2626'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #DC2626'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #DC2626'; }}
            >
              <span>⚖️ Penghakiman</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardPoint;
